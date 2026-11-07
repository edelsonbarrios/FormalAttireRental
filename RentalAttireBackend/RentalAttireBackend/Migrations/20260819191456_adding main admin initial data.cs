using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RentalAttireBackend.Migrations
{
    /// <inheritdoc />
    public partial class addingmainadmininitialdata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
                    migrationBuilder.Sql(@"
                INSERT INTO ""People"" (""Id"", ""Age"", ""ArchivedAt"", ""ArchivedBy"", ""Barangay"", ""City"", ""CreatedAt"", ""CreatedBy"", ""EntityType"", ""FirstName"", ""Gender"", ""IsActive"", ""IsDeleted"", ""LastName"", ""MaritalStatus"", ""MiddleName"", ""PhoneNumber"", ""PostalCode"", ""ProfileImagePath"", ""Province"", ""RestoredAt"", ""RestoredBy"", ""Street"", ""UpdatedAt"", ""UpdatedBy"")
                VALUES (2, 30, NULL, '', 'System Barangay', 'System City', TIMESTAMPTZ '2026-08-20T00:00:00Z', 'System', 'Person', 'Main', 2, TRUE, FALSE, 'Administrator', 0, 'System', '09000000000', '0000', NULL, 'System Province', NULL, '', 'System Street', NULL, '')
                ON CONFLICT (""Id"") DO NOTHING;
            ");

                    migrationBuilder.Sql(@"
                INSERT INTO ""Users"" (""Id"", ""ArchivedAt"", ""ArchivedBy"", ""CreatedAt"", ""CreatedBy"", ""Email"", ""EntityType"", ""HashedPassword"", ""IsActive"", ""IsDeleted"", ""IsGoogleAccount"", ""PersonId"", ""RefreshToken"", ""RefreshTokenExpiryTime"", ""RestoredAt"", ""RestoredBy"", ""UpdatedAt"", ""UpdatedBy"")
                VALUES (2, NULL, '', TIMESTAMPTZ '2026-08-20T00:00:00Z', 'System', 'admin', 'User', 'admin', TRUE, FALSE, FALSE, 2, '', NULL, NULL, '', NULL, '')
                ON CONFLICT (""Id"") DO NOTHING;
            ");

            migrationBuilder.Sql(@"
                INSERT INTO ""Employees"" (""Id"", ""ArchivedAt"", ""ArchivedBy"", ""CreatedAt"", ""CreatedBy"", ""Department"", ""EmployeeCode"", ""EntityType"", ""IsActive"", ""IsDeleted"", ""RestoredAt"", ""RestoredBy"", ""RoleId"", ""Salary"", ""UpdatedAt"", ""UpdatedBy"", ""UserId"")
                VALUES (1, NULL, '', TIMESTAMPTZ '2026-08-20T00:00:00Z', 'System', 'Administration', 'EMP-000001', 'Employee', TRUE, FALSE, NULL, '', 1, 0.0, NULL, '', 2)
                ON CONFLICT (""Id"") DO NOTHING;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Employees",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "People",
                keyColumn: "Id",
                keyValue: 2);
        }
    }
}
