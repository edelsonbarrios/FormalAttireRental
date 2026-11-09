namespace RentalAttireBackend.Application.Rentals.DTOs
{
    public class CustomerStatsDTO
    {
        public string CustomerName { get; set; } = string.Empty;
        public int TotalRentals { get; set; }
        public int TotalSpent { get; set; }
        public int ActiveRentals { get; set; }
    }
}