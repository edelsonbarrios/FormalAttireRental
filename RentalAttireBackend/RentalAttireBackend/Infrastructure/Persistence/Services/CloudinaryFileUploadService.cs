using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.Extensions.Options;
using Npgsql.BackendMessages;
using RentalAttireBackend.Application.Common.Interfaces;
using RentalAttireBackend.Application.Common.Models;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using System.Security.Principal;
using System.Text.RegularExpressions;

namespace RentalAttireBackend.Infrastructure.Persistence.Services
{
    public class CloudinaryFileUploadService : IFileUploadService
    {
        private readonly ImageUploadSettings _imageUploadSettings;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly Cloudinary _cloudinary;

        public CloudinaryFileUploadService
            (
            IOptions<ImageUploadSettings> settings,
            IOptions<CloudinarySettings> cloudinarySettings,
            IHttpClientFactory httpClientFactory
            )
        {
            _imageUploadSettings = settings.Value;
            _httpClientFactory = httpClientFactory;

            var cloudinary = cloudinarySettings.Value;
            var account = new Account(cloudinary.CloudName, cloudinary.ApiKey, cloudinary.ApiSecret);

            _cloudinary = new Cloudinary(account);
            _cloudinary.Api.Secure = true;
        }

        public async Task<FileUploadResult> UploadImageAsync(IFormFile file, string folder)
        {
            try
            {
                var validation = ValidateFile(file);
                if (!validation.Success)
                    return validation;

                if (string.IsNullOrEmpty(folder))
                {
                    return new FileUploadResult
                    {
                        Success = false,
                        ErrorMessage = "Folder path cannot be empty."
                    };
                }

                var fileName = GenerateUniqueFileName(file.FileName);

                // Example public id: clothes/5/dress_20261110063500_abc123
                var publicId = $"{folder}/{Path.GetFileNameWithoutExtension(fileName)}";

                using var imageStream = await PrepareImageStreamAsync(file);

                var uploadParams = new ImageUploadParams
                {
                    File = new FileDescription(fileName, imageStream),
                    PublicId = publicId,
                    Overwrite = false,
                    UseFilename = false,
                    UniqueFilename = false
                };

                var uploadResult = await _cloudinary.UploadAsync(uploadParams);

                if (uploadResult.Error is not null)
                {
                    return new FileUploadResult
                    {
                        Success = false,
                        ErrorMessage = $"Upload failed: {uploadResult.Error.Message}"
                    };
                }

                return new FileUploadResult
                {
                    Success = true,
                    FileName = fileName,
                    // Full permanent URL, this is what gets saved in the database
                    FilePath = uploadResult.SecureUrl.ToString(),
                    FileSize = file.Length,
                    ContentType = file.ContentType
                };
            }
            catch (Exception ex)
            {
                return new FileUploadResult
                {
                    Success = false,
                    ErrorMessage = $"Upload failed: {ex.Message}"
                };
            }
        }

        public async Task<bool> DeleteFileAsync(string filePath)
        {
            try
            {
                var publicId = ExtractPublicId(filePath);

                // Old records still hold dead "uploads/..." paths, nothing to delete for those
                if (publicId is null)
                    return false;

                var result = await _cloudinary.DestroyAsync(new DeletionParams(publicId));
                return result.Result == "ok";
            }
            catch
            {
                return false;
            }
        }

        public async Task<byte[]> GetFileAsync(string filePath)
        {
            if (!IsAbsoluteUrl(filePath))
                return null;

            var client = _httpClientFactory.CreateClient();
            return await client.GetByteArrayAsync(filePath);
        }

        public string GetFileUrl(string filePath)
        {
            // Cloudinary URLs are already complete, so return them untouched
            return filePath;
        }

        private async Task<MemoryStream> PrepareImageStreamAsync(IFormFile file)
        {
            var output = new MemoryStream();
            using var input = file.OpenReadStream();

            try
            {
                using var image = await Image.LoadAsync(input);

                if (image.Width > _imageUploadSettings.MaxWidth || image.Height > _imageUploadSettings.MaxHeight)
                {
                    var ratioX = (double)_imageUploadSettings.MaxWidth / image.Width;
                    var ratioY = (double)_imageUploadSettings.MaxHeight / image.Height;
                    var ratio = Math.Min(ratioX, ratioY);

                    var newWidth = (int)(image.Width * ratio);
                    var newHeight = (int)(image.Height * ratio);

                    image.Mutate(x => x.Resize(newWidth, newHeight));
                    await image.SaveAsync(output, image.Metadata.DecodedImageFormat!);

                    output.Position = 0;
                    return output;
                }
            }
            catch
            {
                // If resize fails, keep original
                output.SetLength(0);
            }

            input.Position = 0;
            await input.CopyToAsync(output);
            output.Position = 0;
            return output;
        }

        private static bool IsAbsoluteUrl(string? path)
        {
            return !string.IsNullOrWhiteSpace(path) &&
                   path.StartsWith("http", StringComparison.OrdinalIgnoreCase);
        }

        private static string? ExtractPublicId(string? filePath)
        {
            if (!IsAbsoluteUrl(filePath) || !filePath!.Contains("res.cloudinary.com"))
                return null;

            // https://res.cloudinary.com/{cloud}/image/upload/v123/clothes/5/name.jpg -> clothes/5/name
            var match = Regex.Match(filePath, @"/upload/(?:v\d+/)?(?<id>.+)\.[^./]+$");
            return match.Success ? match.Groups["id"].Value : null;
        }

        private string GenerateUniqueFileName(string originalFileName)
        {
            var extension = Path.GetExtension(originalFileName);
            var fileName = Path.GetFileNameWithoutExtension(originalFileName);

            fileName = Regex.Replace(fileName, @"[^a-zA-Z0-9_-]", "");

            return $"{fileName}_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid():N}{extension}";
        }

        private FileUploadResult ValidateFile(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return new FileUploadResult
                {
                    Success = false,
                    ErrorMessage = "No file uploaded"
                };
            }

            if (file.Length > _imageUploadSettings.MaxFileSizeInBytes)
            {
                var maxSizeMB = _imageUploadSettings.MaxFileSizeInBytes / 1024 / 1024;
                return new FileUploadResult
                {
                    Success = false,
                    ErrorMessage = $"File size exceeds {maxSizeMB}MB limit"
                };
            }

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!_imageUploadSettings.AllowedExtensions.Contains(extension))
            {
                return new FileUploadResult
                {
                    Success = false,
                    ErrorMessage = $"File type not allowed. Allowed: {string.Join(", ", _imageUploadSettings.AllowedExtensions)}"
                };
            }

            return new FileUploadResult { Success = true };
        }
    }
}