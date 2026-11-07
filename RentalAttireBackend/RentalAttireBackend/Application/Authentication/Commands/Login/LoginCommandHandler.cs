using AutoMapper;
using MediatR;
using Microsoft.AspNetCore.Components.Forms;
using Microsoft.AspNetCore.Http.HttpResults;
using RentalAttireBackend.Application.Common.Interfaces;
using RentalAttireBackend.Application.Common.Models;
using RentalAttireBackend.Application.Users.DTO;
using RentalAttireBackend.Domain.Interfaces;

namespace RentalAttireBackend.Application.Authentication.Commands.Login
{
    public class LoginCommandHandler : IRequestHandler<LoginCommand, Result<AuthenticationResult>>
    {
        private readonly IUserRepository _userRepo;
        private readonly IPasswordHasher _passwordHasher;
        private readonly IJwtTokenGenerator _tokenGenerator;
        private readonly IMapper _mapper;
        private readonly IAuditLogService _auditService;
        public LoginCommandHandler
            (
            IUserRepository userRepo,
            IPasswordHasher passwordHasher,
            IJwtTokenGenerator tokenGenerator,
            IMapper mapper,
            IAuditLogService auditService
            )
        {
            _userRepo = userRepo;
            _passwordHasher = passwordHasher;
            _tokenGenerator = tokenGenerator;
            _mapper = mapper;
            _auditService = auditService;
        }
        public async Task<Result<AuthenticationResult>> Handle(LoginCommand command, CancellationToken cancellationToken)
        {
            if (command is null)
                return Result<AuthenticationResult>.Failure("Invalid request. Please fill in the required fields.");

            try
            {
                var user = await _userRepo.GetUserByEmailAsync(command.Email, cancellationToken);

                if (user is null)
                    return Result<AuthenticationResult>.Failure("Invalid email or password. Please try again.");

                var passwordValidation = _passwordHasher.VerifyPassword(command.Password, user.HashedPassword);

                if (!passwordValidation)
                    return Result<AuthenticationResult>.Failure("Invalid email or password. Please try again.");

                var accessToken = _tokenGenerator.GenerateAccessToken(user);
                var refreshToken = _tokenGenerator.GenerateRefreshToken();

                user.RefreshToken = refreshToken;
                user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);

                var loginAuditLog = await _auditService.LoginAuditLogAsync(user, user.Person.FullName, user.Id);

                if (!loginAuditLog)
                    return Result<AuthenticationResult>.Failure("Audit trail failed. Please try again."); 

                await _userRepo.UpdateUserAsync(user, cancellationToken);

                return Result<AuthenticationResult>.Success(new AuthenticationResult    
                {
                    Id = user.Id,
                    AccessToken = accessToken,
                    RefreshToken = refreshToken,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(60),
                    Email = user.Email,
                    IsProfileComplete = user.Person.IsProfileComplete
                });
            }catch(Exception e)
            {
                return Result<AuthenticationResult>.Failure(e.Message);
            }
        }
    }
}
