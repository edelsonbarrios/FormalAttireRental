using MediatR;
using RentalAttireBackend.Application.Common.Interfaces;
using RentalAttireBackend.Application.Common.Models;
using RentalAttireBackend.Application.Rentals.DTOs;
using RentalAttireBackend.Domain.Interfaces;

namespace RentalAttireBackend.Application.Rentals.Queries.CustomerStats
{
    public class CustomerStatsQueryHandler : IRequestHandler<CustomerStatsQuery, Result<CustomerStatsDTO>>
    {
        private readonly IRentalRepository _rentalRepo;
        private readonly ICurrentUserService _currentUserService;
        private readonly IUserRepository _userRepo;

        public CustomerStatsQueryHandler(
            IRentalRepository rentalRepo,
            ICurrentUserService currentUserService,
            IUserRepository userRepo
            )
        {
            _rentalRepo = rentalRepo;
            _currentUserService = currentUserService;
            _userRepo = userRepo;
        }

        public async Task<Result<CustomerStatsDTO>> Handle(CustomerStatsQuery request, CancellationToken cancellationToken)
        {
            var userId = _currentUserService.UserId;

            if (userId is null || userId == 0)
                return Result<CustomerStatsDTO>.FailureWithErrorType("User does not exist.", ErrorType.NotFound);

            var customerUser = await _userRepo.GetUserByIdWithCustomerAsync(userId.Value, cancellationToken);

            if (customerUser is null || customerUser.Customer is null)
                return Result<CustomerStatsDTO>.FailureWithErrorType("Customer could not be found.", ErrorType.NotFound);

            var stats = await _rentalRepo.GetCustomerRentalStatsAsync(customerUser.Customer.Id, cancellationToken);

            stats.CustomerName = customerUser.Person.FirstName;

            return Result<CustomerStatsDTO>.Success(stats);
        }
    }
}