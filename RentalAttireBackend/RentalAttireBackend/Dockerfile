
# ============================================================
# Stage 1: Runtime
# ============================================================
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base

WORKDIR /app

# Render will communicate with the application through port 10000.
ENV ASPNETCORE_HTTP_PORTS=10000

EXPOSE 10000


# ============================================================
# Stage 2: Build
# ============================================================
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src

# Copy the project file and restore NuGet dependencies.
COPY ["RentalAttireBackend.csproj", "./"]

RUN dotnet restore "RentalAttireBackend.csproj"

# Copy the remaining application files.
COPY . .

# Build and publish the application.
RUN dotnet publish "RentalAttireBackend.csproj" \
    -c Release \
    -o /app/publish \
    --no-restore


# ============================================================
# Stage 3: Final Runtime
# ============================================================
FROM base AS final

WORKDIR /app

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "RentalAttireBackend.dll"]
