using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.MicrosoftExtensions;
using RentalAttireBackend.Application.Common.Models;
using RentalAttireBackend.Application.Rentals.DTOs;
using RentalAttireBackend.Domain.Entities;
using RentalAttireBackend.Domain.Interfaces;
using RentalAttireBackend.Infrastructure.Persistence.DataContext;
using System.Reflection.Metadata.Ecma335;

namespace RentalAttireBackend.Infrastructure.Persistence.Repositories
{
    public class RentalRepository : IRentalRepository
    {
        private readonly FormalAttireContext _context;

        public RentalRepository(FormalAttireContext context)
        {
            _context = context;
        }

        public async Task<bool> CreateRentalAsync(Rental newRental, CancellationToken ct)
        {
            await _context.AddAsync(newRental);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<PagedResult<Rental>> FilterRentalItemsAsync(
            string? status, 
            string? searchQuery,
            DateTime? startingDate, 
            DateTime? endingDate, 
            int currentPage, 
            int itemsPerPage, 
            CancellationToken ct)
        {
            var statusValidator = string.IsNullOrEmpty(status);
            var searchQueryValidator = string.IsNullOrEmpty(searchQuery);

            var startingDateUtc = startingDate.HasValue
                ? DateTime.SpecifyKind(startingDate.Value, DateTimeKind.Utc)
                : (DateTime?)null;

            var endingDateUtc = endingDate.HasValue
                ? DateTime.SpecifyKind(endingDate.Value, DateTimeKind.Utc)
                : (DateTime?)null;

            var rentals = _context.Rentals
                .Include(r => r.Customer)
                    .ThenInclude(c => c.User)
                        .ThenInclude(u => u.Person)
                .Include(r => r.RentalItems)
                    .ThenInclude(ri => ri.Clothe)
                        .ThenInclude(c => c.Category)
                .OrderByDescending(r => r.Id)
                .Where(r =>
                    (
                    searchQueryValidator || 
                    r.Customer.User.Person.LastName.ToLower().Contains(searchQuery.ToLower()) ||
                    r.Customer.User.Person.FirstName.ToLower().Contains(searchQuery.ToLower())
                    ) 
                    &&
                    (
                    statusValidator || r.Status.ToLower().Equals(status.ToLower())
                    )
                    &&
                    (
                    !startingDate.HasValue || r.RentalDate >= startingDateUtc
                    )
                    &&
                    (
                    !endingDate.HasValue || r.RentalDate <= endingDateUtc
                    )
                    &&
                    r.IsActive
                );

            var totalCount = await rentals.CountAsync(ct);

            var paginatedRentals = await rentals
                .Skip((currentPage - 1) * itemsPerPage)
                .Take(itemsPerPage)
                .ToListAsync(ct);

            return new PagedResult<Rental>
            {
                Items = paginatedRentals,
                TotalCount = totalCount,
                PageNumber = currentPage,
                PageSize = itemsPerPage
            };
        }

        public async Task<List<Rental>> GetAllRentalsAsync(CancellationToken cancellationToken)
        {
            return await _context.Rentals
                .Include(r => r.RentalItems)
                    .ThenInclude(ri => ri.Clothe)
                .OrderByDescending(r => r.Id)
                .ToListAsync(cancellationToken);
        }

        public async Task<double> GetAllRentalsTotalRevenue(CancellationToken cancellationToken)
        {
            return await _context.Rentals
                .Where(r => AllowedStatusConditions.RevenueStatuses.Contains(r.Status))
                .SumAsync(r => r.TotalAmount);
        }

        public async Task<PagedResult<Rental>> GetCustomerRentalsAsync(
            int customerId,
            string? searchQuery,
            string rentalStatus,
            DateTime? startingDate,
            DateTime? endingDate,
            int currentPage,
            int itemsPerPage,
            CancellationToken cancellationToken)
        {
            var searchQueryValidator = string.IsNullOrWhiteSpace(searchQuery);
            var rentalStatusValidator = string.IsNullOrWhiteSpace(rentalStatus);

            if (!AllowedStatusConditions.MyRentalFilters.TryGetValue(rentalStatus.ToLower(), out var statusConditions))
                throw new ArgumentException("Invalid rental status condition.");

            var startingDateUtc = startingDate.HasValue
                ? DateTime.SpecifyKind(startingDate.Value, DateTimeKind.Utc)
                : (DateTime?)null;

            var endingDateUtc = endingDate.HasValue
                ? DateTime.SpecifyKind(endingDate.Value, DateTimeKind.Utc)
                : (DateTime?)null;


              var query = _context.Rentals
                .Include(r => r.Customer)
                    .ThenInclude(c => c.User)
                        .ThenInclude(u => u.Person)
                .Include(r => r.RentalItems)
                    .ThenInclude(ri => ri.Clothe)
                .OrderByDescending(r => r.Id)
                .Where(r =>
                    (
                    searchQueryValidator ||
                    r.RentalCode.ToLower().Contains(searchQuery.ToLower())
                    ) &&
                    (
                    !startingDate.HasValue || r.RentalDate >= startingDateUtc
                    ) &&
                    (
                    !endingDate.HasValue || r.ReturnDate <= endingDateUtc
                    ) &&
                    r.IsActive &&
                    r.Customer.Id == customerId
                )
                .AsQueryable();

            var rentals = rentalStatus switch
            {
                "active" => query.Where(r => statusConditions.Contains(r.Status)),
                "declined" => query.Where(r => statusConditions.Contains(r.Status)),
                "completed" => query.Where(r => statusConditions.Contains(r.Status)),
                _ => throw new ArgumentException("Invalid rental status condition.")
            };

            var paginatedRentals = await rentals
                .Skip((currentPage - 1) * itemsPerPage)
                .Take(itemsPerPage)
                .ToListAsync(cancellationToken);

            var totalCount = await rentals.CountAsync(cancellationToken);

            return new PagedResult<Rental>
            {
                Items = paginatedRentals,
                TotalCount = totalCount,
                PageNumber = currentPage,
                PageSize = itemsPerPage
            };
        }

        public async Task<RentalAnalytics> GetRentalAnalyticsAsync(CancellationToken cancellationToken)
        {
            var dateToday = DateTime.UtcNow.Date;
            var dueSoonThreshold = DateTime.UtcNow.Date.AddDays(7);

            var statusCounts = await _context.Rentals
                .GroupBy(r => r.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToListAsync(cancellationToken);

            var overdueCount = await _context.Rentals
                .Where(r =>
                    r.IsActive &&
                    r.ReturnDate != null &&
                    (r.Status == "Confirmed" || r.Status == "Ready for pickup") &&
                    r.ReturnDate < dateToday
                ).CountAsync(cancellationToken);

            var dueSoonCount = await _context.Rentals
                .Where(r =>
                    r.IsActive &&
                    r.ReturnDate != null &&
                    (r.Status == "Confirmed" || r.Status == "Ready for pickup") &&
                    r.ReturnDate >= dateToday &&
                    r.ReturnDate <= dueSoonThreshold
                ).CountAsync(cancellationToken);

            return new RentalAnalytics
            {
                StatusCounts = statusCounts.ToDictionary(x => x.Status, x => x.Count),
                OverdueCount = overdueCount,
                DueSoonCount = dueSoonCount
            };
        }

        public async Task<Rental?> GetRentalByIdAsync(int id, CancellationToken cancellationToken)
        {
            return await _context.Rentals
                .Include(r => r.RentalItems)
                    .ThenInclude(ri => ri.Clothe)
                .Include(r => r.Customer)
                .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        }

        public async Task<bool> UpdateRentalAsync(Rental rental, CancellationToken cancellationToken)
        {
            _context.Rentals.Update(rental);
            return await _context.SaveChangesAsync() > 0;
        }

        private static readonly string[] SpentStatuses =
            { "confirmed", "ready for pickup", "returned", "overdue" };

        public async Task<CustomerStatsDTO> GetCustomerRentalStatsAsync(
            int customerId,
            CancellationToken cancellationToken)
        {
            var activeStatuses = AllowedStatusConditions.MyRentalFilters["active"];

            var rentals = _context.Rentals
                .Where(r => r.IsActive && r.Customer.Id == customerId);

            var totalRentals = await rentals
                .CountAsync(r => r.Status.ToLower() != "declined", cancellationToken);

            var totalSpent = await rentals
                .Where(r => SpentStatuses.Contains(r.Status.ToLower()))
                .SumAsync(r => (int?)r.TotalAmount, cancellationToken) ?? 0;

            var activeRentals = await rentals
                .CountAsync(r => activeStatuses.Contains(r.Status), cancellationToken);

            return new CustomerStatsDTO
            {
                TotalRentals = totalRentals,
                TotalSpent = totalSpent,
                ActiveRentals = activeRentals
            };
        }
    }
}
