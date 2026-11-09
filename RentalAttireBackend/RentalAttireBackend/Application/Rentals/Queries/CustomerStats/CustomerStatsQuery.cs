using MediatR;
using RentalAttireBackend.Application.Common.Models;
using RentalAttireBackend.Application.Rentals.DTOs;

namespace RentalAttireBackend.Application.Rentals.Queries.CustomerStats
{
    public class CustomerStatsQuery : IRequest<Result<CustomerStatsDTO>>
    {
    }
}