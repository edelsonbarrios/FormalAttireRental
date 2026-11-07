using System.Security.Claims;
using System.Text;

using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using RentalAttireBackend.Api.Services;
using RentalAttireBackend.Application;
using RentalAttireBackend.Application.Common.Behaviors;
using RentalAttireBackend.Application.Common.Exceptions;
using RentalAttireBackend.Application.Common.Interfaces;
using RentalAttireBackend.Application.Common.Models;
using RentalAttireBackend.Application.Disposables.EntityDeleters;
using RentalAttireBackend.Application.Disposables.EntityRestorers.ClotheRestorer;
using RentalAttireBackend.Application.Disposables.EntityRestorers.CustomerRestorer;
using RentalAttireBackend.Application.Disposables.EntityRestorers.EmployeeRestorer;
using RentalAttireBackend.Application.Disposables.EntityRestorers.SupplierRestorer;
using RentalAttireBackend.Application.Disposables.ViewArchivedRecords.ViewCategoryRecord;
using RentalAttireBackend.Application.Disposables.ViewArchivedRecords.ViewClotheRecord;
using RentalAttireBackend.Application.Disposables.ViewArchivedRecords.ViewCustomerRecord;
using RentalAttireBackend.Application.Disposables.ViewArchivedRecords.ViewEmployeeRecord;
using RentalAttireBackend.Application.Mapping;

using RentalAttireBackend.Domain.Interfaces;

using RentalAttireBackend.Infrastructure.Authentication;
using RentalAttireBackend.Infrastructure.Persistence.DataContext;
using RentalAttireBackend.Infrastructure.Persistence.Repositories;
using RentalAttireBackend.Infrastructure.Persistence.Services;


var builder = WebApplication.CreateBuilder(args);


// ============================================================
// ASP.NET Core Services
// ============================================================

builder.Services.AddControllers();
builder.Services.AddOpenApi();


// ============================================================
// Configuration / Settings
// ============================================================

builder.Services.Configure<JwtSettings>(
    builder.Configuration.GetSection("JwtSettings"));

builder.Services.Configure<ImageUploadSettings>(
    builder.Configuration.GetSection("ImageUploadSettings"));

builder.Services.Configure<GoogleAuthSettings>(
    builder.Configuration.GetSection("Authentication:Google"));

var jwtSettings = builder.Configuration
    .GetSection("JwtSettings")
    .Get<JwtSettings>();


// ============================================================
// Authentication
// ============================================================

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(x =>
    {
        x.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSettings.Issuer,

            ValidateAudience = true,
            ValidAudience = jwtSettings.Audience,

            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtSettings.SecretKey)),

            ClockSkew = TimeSpan.Zero,
            RoleClaimType = ClaimTypes.Role
        };
    });


// ============================================================
// Application Services
// ============================================================

// AutoMapper
builder.Services.AddAutoMapper(
    x => x.AddProfile<MappingProfile>());

// MediatR
builder.Services.AddMediatR(
    x => x.RegisterServicesFromAssembly(typeof(AssemblyMarker).Assembly));

// FluentValidation
builder.Services.AddValidatorsFromAssemblyContaining<AssemblyMarker>();

// MediatR Validation Pipeline Behavior
builder.Services.AddTransient(
    typeof(IPipelineBehavior<,>),
    typeof(ValidationBehavior<,>));


// ============================================================
// Exception Handling / ProblemDetails
// ============================================================

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();


// ============================================================
// Database
// ============================================================

builder.Services.AddDbContext<FormalAttireContext>(
    x => x.UseNpgsql(
        builder.Configuration.GetConnectionString("FormalAttireDb")));


// ============================================================
// Repository / Application Dependencies
// ============================================================

// Repositories
builder.Services.AddScoped<IPersonRepository, PersonRepository>();
builder.Services.AddScoped<IEmployeeRepository, EmployeeRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IClotheRepository, ClotheRepository>();
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<ICustomerRepository, CustomerRepository>();
builder.Services.AddScoped<IRentalRepository, RentalRepository>();
builder.Services.AddScoped<ISupplierRepository, SupplierRepository>();
builder.Services.AddScoped<IPurchaseOrderRepository, PurchaseOrderRepository>();

// Services
builder.Services.AddScoped<ITransactionManager, TransactionManager>();
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
builder.Services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
builder.Services.AddScoped<IFileUploadService, FileUploadService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();

// Entity Restorers
builder.Services.AddScoped<IEntityRestorer, CustomerRestorer>();
builder.Services.AddScoped<IEntityRestorer, ClotheRestorer>();
builder.Services.AddScoped<IEntityRestorer, EmployeeRestorer>();
builder.Services.AddScoped<IEntityRestorer, SupplierRestorer>();

// Archived Record Viewers
builder.Services.AddScoped<IViewArchivedEntity, ViewCategoryRecord>();
builder.Services.AddScoped<IViewArchivedEntity, ViewClotheRecord>();
builder.Services.AddScoped<IViewArchivedEntity, ViewCustomerRecord>();
builder.Services.AddScoped<IViewArchivedEntity, ViewEmployeeRecord>();

// Archived Entity Deleters
builder.Services.AddScoped<IDeleteArchivedEntity, CategoryDeleter>();
builder.Services.AddScoped<IDeleteArchivedEntity, ClotheDeleter>();
builder.Services.AddScoped<IDeleteArchivedEntity, EmployeeDeleter>();
builder.Services.AddScoped<IDeleteArchivedEntity, CustomerDeleter>();

//Current User Service
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();


// ============================================================
// HTTP / Web Services
// ============================================================

builder.Services.AddHttpContextAccessor();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});


var app = builder.Build();


// ============================================================
// HTTP Request Pipeline
// ============================================================

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowAll");

app.UseExceptionHandler();

app.UseStaticFiles();

app.UseHttpsRedirection();

app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();

app.Run();