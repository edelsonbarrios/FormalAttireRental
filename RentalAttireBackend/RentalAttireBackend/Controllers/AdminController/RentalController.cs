using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RentalAttireBackend.Application.Common.Extensions;
using RentalAttireBackend.Application.Rentals.Commands.RentalTransaction;
using RentalAttireBackend.Application.Rentals.Commands.UpdateRentalStatusCommand;
using RentalAttireBackend.Application.Rentals.Queries.CustomerRentals;
using RentalAttireBackend.Application.Rentals.Queries.FilterRentals;
using RentalAttireBackend.Application.Rentals.Queries.GetAllRentals;
using RentalAttireBackend.Application.Rentals.Queries.CustomerStats;

namespace RentalAttireBackend.Controllers.AdminController
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class RentalController : ControllerBase
    {
        private readonly IMediator _meaditor; //Mediator
        private readonly IHttpContextAccessor _httpContextAccessor;

        public RentalController(IMediator mediator, IHttpContextAccessor httpContextAccessor)
        {
            _meaditor = mediator;
            _httpContextAccessor = httpContextAccessor;
        }
        [HttpGet]
        public async Task<IActionResult> FilterRentalsAsync(
            string? status,
            string? searchQuery,
            int currentPage,
            int itemsPerPage,
            DateTime? startingDate,
            DateTime? endingDate
        )
        {
            var result = await _meaditor.Send(new FilterRentalsQuery
            {
                Status = status,
                SearchQuery = searchQuery,
                CurrentPage = currentPage,
                ItemsPerPage = itemsPerPage,
                StartingDate = startingDate,
                EndingDate = endingDate
            });

            return result.ToActionResult(this, _httpContextAccessor);
        }

        [HttpGet("all-rentals")]
        public async Task<IActionResult> GetAllRentalsAsync(GetAllRentalsQuery query)
        {
            var result = await _meaditor.Send(query);

            return result.IsSuccess ? Ok(result) : BadRequest(result.ErrorMessage);
        }

        [HttpPost]
        public async Task<IActionResult> RentalReservationAsync(RentalTransactionCommand command)
        {
            var result = await _meaditor.Send(command);

            return result.ToActionResult(this, _httpContextAccessor);
        }

        [HttpPatch]
        public async Task<IActionResult> UpdateRentalStatusAsync(UpdateRentalStatusCommmand command)
        {
            var result = await _meaditor.Send(command);

            return result.ToActionResult(this, _httpContextAccessor); 
        }

        [HttpGet("my-rentals")]
        public async Task<IActionResult> GetCustomersRentalsAsync(
            string? searchQuery,
            string? rentalStatus,
            DateTime? startingDate,
            DateTime? endingDate,
            int currentPage,
            int itemsPerPage
            )
        {
            var result = await _meaditor.Send(new CustomerRentalsQuery
            {
                SearchQuery =  searchQuery,
                RentalStatus = rentalStatus,
                StartingDate = startingDate,
                EndingDate = endingDate,
                CurrentPage = currentPage,
                ItemsPerPage = itemsPerPage
            });

            return result.ToActionResult(this, _httpContextAccessor);
        }

        [HttpGet("my-stats")]
        public async Task<IActionResult> GetCustomerStatsAsync()
        {
            var result = await _meaditor.Send(new CustomerStatsQuery());

            return result.ToActionResult(this, _httpContextAccessor);
        }
    }
}
