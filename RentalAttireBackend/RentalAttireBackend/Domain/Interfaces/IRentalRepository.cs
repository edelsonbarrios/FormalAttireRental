using RentalAttireBackend.Application.Common.Models;
using RentalAttireBackend.Application.Rentals.DTOs;
using RentalAttireBackend.Domain.Entities;

namespace RentalAttireBackend.Domain.Interfaces
{
    public interface  IRentalRepository
    {
        #region Commands
        public Task<bool> CreateRentalAsync(Rental newRental, CancellationToken ct);
        public Task<bool> UpdateRentalAsync(Rental rental, CancellationToken cancellationToken);
        #endregion

        #region Queries
        public Task<PagedResult<Rental>> FilterRentalItemsAsync(
            string? status,
            string? searchQuery,
            DateTime? startingDate,
            DateTime? endingDate,
            int currentPage,
            int itemsPerPage,
            CancellationToken ct
            );

        public Task<List<Rental>> GetAllRentalsAsync(
            CancellationToken cancellationToken
            );

        public Task<Rental?> GetRentalByIdAsync(
            int id,
            CancellationToken cancellationToken
            );

        public Task<double> GetAllRentalsTotalRevenue(
            CancellationToken cancellationToken
            );

        public Task<RentalAnalytics> GetRentalAnalyticsAsync(CancellationToken cancellationToken);
        #endregion

        public Task<PagedResult<Rental>> GetCustomerRentalsAsync(
            int customerId,
            string searchQuery,
            string rentalStatus,
            DateTime? startingDate,
            DateTime? endingDate,
            int currentPage,
            int itemsPerPage,
            CancellationToken cancellationToken);

        public Task<CustomerStatsDTO> GetCustomerRentalStatsAsync(
            int customerId,
            CancellationToken cancellationToken);
    }
}
