using AutoMapper;
using Google.Apis.Auth;
using MediatR;
using Microsoft.AspNetCore.Localization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RentalAttireBackend.Application.Common.Interfaces;
using RentalAttireBackend.Application.Common.Models;
using RentalAttireBackend.Application.Users.DTO;
using RentalAttireBackend.Domain.Entities;
using RentalAttireBackend.Domain.Interfaces;

namespace RentalAttireBackend.Application.Authentication.Commands.GoogleLogin
{
    public class GoogleLoginCommandHandler : IRequestHandler<GoogleLoginCommand, Result<AuthenticationResult>>
    {
        private readonly ITransactionManager _transactionManager;
        private readonly IUserRepository _userRepo;
        private readonly IAuditLogService _auditService;
        private readonly GoogleAuthSettings _googleAuthSettings;
        private readonly IMapper _mapper;
        private readonly IJwtTokenGenerator _tokenGenerator;
        private readonly ICustomerRepository _customerRepo;
        private readonly IPasswordHasher _passwordHasher;
        private readonly IFileUploadService _fileUploadService;
        private readonly ILogger<GoogleLoginCommandHandler> _logger;

        public GoogleLoginCommandHandler(
            ITransactionManager transactionManager,
            IUserRepository userRepo,
            IAuditLogService auditService,
            IOptions<GoogleAuthSettings> googleSettings,
            IMapper mapper,
            IJwtTokenGenerator tokenGenerator,
            ICustomerRepository customerRepo,
            IPasswordHasher passwordHasher,
            IFileUploadService fileUploadService,
            ILogger<GoogleLoginCommandHandler> logger
            )
        {
            _transactionManager = transactionManager;
            _userRepo = userRepo;
            _auditService = auditService;
            _googleAuthSettings = googleSettings.Value;
            _mapper = mapper;
            _tokenGenerator = tokenGenerator;
            _customerRepo = customerRepo;
            _passwordHasher = passwordHasher;
            _fileUploadService = fileUploadService;
            _logger = logger;
        }
        public async Task<Result<AuthenticationResult>> Handle(GoogleLoginCommand command, CancellationToken cancellationToken)
        {
            if (command is null || string.IsNullOrEmpty(command.IdToken))
                return Result<AuthenticationResult>.Failure("Invalid request.");

            try
            {
                GoogleJsonWebSignature.Payload payload;

                try
                {
                    var validationSettings = new GoogleJsonWebSignature.ValidationSettings
                    {
                        Audience = [_googleAuthSettings.ClientId]
                    };

                    payload = await GoogleJsonWebSignature.ValidateAsync(command.IdToken, validationSettings);

                }
                catch (InvalidJwtException ex)
                {
                    _logger.LogWarning(
                        ex,
                        "Google token validation failed. Reason: {Reason}. Configured ClientId: '{ClientId}'",
                        ex.Message,
                        _googleAuthSettings.ClientId);

                    return Result<AuthenticationResult>.Failure("Invalid google token.");
                }

                var user = await _userRepo.GetUserByEmailAsync(payload.Email, cancellationToken);

                if (user is not null)
                {
                    await _transactionManager.BeginTransactionAsync(cancellationToken);

                    var accessToken = _tokenGenerator.GenerateAccessToken(user);
                    var refreshToken = _tokenGenerator.GenerateRefreshToken();

                    user.RefreshToken = refreshToken;
                    user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);

                    var auditTransaction = await _auditService.LoginAuditLogAsync(user, user.Person.FullName, user.Id);

                    if (!auditTransaction)
                    {
                        await _transactionManager.RollbackTransactionAsync(cancellationToken);
                        return Result<AuthenticationResult>.Failure("Transaction record could not be audited.");
                    }

                    var updateUser = await _userRepo.UpdateUserAsync(user, cancellationToken);

                    if (!updateUser)
                    {
                        await _transactionManager.RollbackTransactionAsync(cancellationToken);
                        return Result<AuthenticationResult>.Failure("Refresh & Access token could not be updated.");
                    }

                    var userDto = _mapper.Map<UserDTO>(user);

                    await _transactionManager.CommitTransacionAsync(cancellationToken);
                    return Result<AuthenticationResult>.Success(new AuthenticationResult
                    {
                        AccessToken = accessToken,
                        RefreshToken = refreshToken,
                        ExpiresAt = DateTime.UtcNow.AddMinutes(60),
                        Id = user.Id,
                        Email = user.Email,
                        IsProfileComplete = user.Person.IsProfileComplete
                    });
                }

                await _transactionManager.BeginTransactionAsync(cancellationToken);

                var newPerson = new Person();
                newPerson.FirstName = payload.GivenName;
                newPerson.LastName = payload.FamilyName ?? "";
                newPerson.CreatedBy = payload.Name;
                newPerson.EntityType = "Person";
                newPerson.ProfileImagePath = payload.Picture;

                var newUser = new User
                {
                    Email = payload.Email,
                    Person = newPerson,
                    IsGoogleAccount = true,
                    CreatedBy = payload.Name,
                    CreatedAt = DateTime.UtcNow.AddHours(8),
                    EntityType = "User",
                };

                var newCustomer = new Customer
                {
                    CustomerCode = GenerateCustomerCode(payload.Email),
                    TotalRentals = 0,
                    TotalSpent = 0,
                    User = newUser,
                    CreatedBy = payload.Name,
                    CreatedAt = DateTime.UtcNow.AddHours(8),
                    EntityType = "Customer"
                };

                var createCustomer = await _customerRepo.CreateCustomerAsync(newCustomer, cancellationToken);

                if (!createCustomer)
                {
                    await _transactionManager.RollbackTransactionAsync(cancellationToken);
                    return Result<AuthenticationResult>.Failure("Failed to create customer record.");
                }

                var newAccessToken = _tokenGenerator.GenerateAccessToken(newUser);
                var newRefreshToken = _tokenGenerator.GenerateRefreshToken();

                newUser.RefreshToken = newRefreshToken;
                newUser.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);

                var initializeTokens = await _userRepo.UpdateUserAsync(newUser, cancellationToken);

                if (!initializeTokens)
                {
                    await _transactionManager.RollbackTransactionAsync(cancellationToken);
                    return Result<AuthenticationResult>.Failure("Refresh & Access token could not be initialized.");
                }

                var newUserDto = _mapper.Map<UserDTO>(newUser);

                await _transactionManager.CommitTransacionAsync(cancellationToken);
                return Result<AuthenticationResult>.Success(new AuthenticationResult
                {
                    AccessToken = newAccessToken,
                    RefreshToken = newRefreshToken,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(60),
                    Id = newUser.Id,
                    Email = newUser.Email,
                    IsProfileComplete = newUser.Person.IsProfileComplete
                });
            }
            catch (Exception e)
            {
                await _transactionManager.RollbackTransactionAsync(cancellationToken);
                var error = e.InnerException?.Message ?? e.Message;

                return Result<AuthenticationResult>.Failure(error);
            }
        }

        private static string GenerateCustomerCode(string email)
        {
            var prefix = email.Split('@')[0]
                [..Math.Min(4, email.Split('@')[0].Length)]
                .ToUpper();
            var suffix = Guid.NewGuid().ToString("N")[..6].ToUpper();
            return $"CUST-{prefix}-{suffix}";
        }
    }
}