import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ClotheDTO } from '../../../data/models/DTOs/Clothes/clothes';
import { RentalDTO } from '../../../data/models/DTOs/Rentals/rental';
import { ClotheService } from '../../admin/clothes/clothe-service/clothe.service';
import { CategoryService } from '../../admin/categories/category-service/category.service';
import { MyRentalService } from '../my-rental/my-rental-service/my-rental.service';

// ── View models: the shape the template reads ────────────────
// Real RentalDTO data is mapped into these in toRentalSummary().
export class RentalSummary {
  id: number           = 0;
  rentalCode: string   = '';
  status: string       = '';
  startDate: Date | null = null;
  endDate: Date | null   = null;
  totalAmount: number  = 0;
  items: RentalItem[]  = [];
}

export class RentalItem {
  clotheName: string  = '';
  clotheCode: string  = '';
  rentalPrice: number = 0;
}
// ─────────────────────────────────────────────────────────────

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterModule],
  templateUrl: './customer-dashboard.component.html',
  styleUrl: './customer-dashboard.component.scss',
})
export class CustomerDashboardComponent implements OnInit {

  // ── State ──────────────────────────────────────────────────
  isLoadingRentals  = false;
  isLoadingClothes  = false;

  customerName      = 'there';
  totalRentals      = 0;
  totalSpent        = 0;
  activeRentals     = 0;

  activeOrders: RentalSummary[] = [];
  featuredClothes: ClotheDTO[]  = [];

  // ── Display limits ─────────────────────────────────────────
  private readonly maxActiveOrders = 3;
  private readonly maxFeaturedClothes = 8;

  // ── Filter for featured clothes ────────────────────────────
  activeCategoryFilter = 'All';
  categoryFilters: string[] = ['All'];

  // Canonical lowercase order used for matching, decoupled from
  // however the backend happens to capitalize the status string.
  private readonly statusOrder = ['pending', 'confirmed', 'ready for pickup', 'returned'];

  constructor(
    private myRentalService: MyRentalService,
    private clotheService: ClotheService,
    private categoryService: CategoryService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loadStats();
    this.loadActiveOrders();
    this.loadCategories();
    this.loadFeaturedClothes();
  }

  // ============================================================
  // Stats + customer name
  // ============================================================
  loadStats(): void {
    this.myRentalService.getCustomerStatsAsync()
      .then(res => {
        if (!res.isSuccess || !res.data) {
          this.toastr.error(res.errorMessage ?? 'Failed to load your rental stats.');
          return;
        }

        this.customerName  = this.toTitleCase(res.data.customerName) || 'there';
        this.totalRentals  = res.data.totalRentals;
        this.totalSpent    = res.data.totalSpent;
        this.activeRentals = res.data.activeRentals;
      })
      .catch(() => this.toastr.error('Failed to load your rental stats.'));
  }

  // ============================================================
  // Active orders
  // ============================================================
  loadActiveOrders(): void {
    this.isLoadingRentals = true;

    this.myRentalService.getCustomerRentalsAsync('', 'active', 1, this.maxActiveOrders)
      .then(res => {
        if (!res.isSuccess) {
          this.activeOrders = [];

          // "No rentals found" is a normal state on the dashboard, not an error.
          if (!this.isNoRentalsMessage(res.errorMessage)) {
            this.toastr.error(res.errorMessage ?? 'Failed to load your active orders.');
          }
          return;
        }

        this.activeOrders = (res.data?.items ?? []).map(r => this.toRentalSummary(r));
      })
      .catch(() => {
        this.activeOrders = [];
        this.toastr.error('Failed to load your active orders.');
      })
      .finally(() => this.isLoadingRentals = false);
  }

  private toRentalSummary(rental: RentalDTO): RentalSummary {
    return {
      id: rental.id,
      rentalCode: rental.rentalCode,
      status: rental.status,
      startDate: rental.pickupDate ? new Date(rental.pickupDate) : null,
      endDate: rental.returnDate ? new Date(rental.returnDate) : null,
      totalAmount: rental.totalAmount,
      items: (rental.rentalItems ?? []).map(item => ({
        clotheName: item.clothe?.clotheName ?? '',
        clotheCode: item.clothe?.clotheCode ?? '',
        // Line total (price x quantity), so the item prices add up to the order amount
        rentalPrice: item.totalAmount,
      })),
    };
  }

  private isNoRentalsMessage(message?: string): boolean {
    return /no rentals/i.test(message ?? '');
  }

  // ============================================================
  // Categories + featured clothes
  // ============================================================
  loadCategories(): void {
    this.categoryService.getAllCategories()
      .then(res => {
        const names = (res.data ?? []).map(c => c.categoryName);
        this.categoryFilters = ['All', ...names];
      })
      .catch(() => {
        // Keep just the "All" pill if categories can't load
      });
  }

  loadFeaturedClothes(): void {
    this.isLoadingClothes = true;

    const category = this.activeCategoryFilter === 'All' ? '' : this.activeCategoryFilter;

    this.clotheService.filterClothesAsync('', '', '', category, 1, this.maxFeaturedClothes)
      .then(res => {
        this.featuredClothes = res.data?.items ?? [];
      })
      .catch(() => {
        this.featuredClothes = [];
        this.toastr.error('Failed to load the catalogue.');
      })
      .finally(() => this.isLoadingClothes = false);
  }

  setFilter(filter: string): void {
    if (filter === this.activeCategoryFilter) return;
    this.activeCategoryFilter = filter;
    this.loadFeaturedClothes();
  }

  // ── Helpers ────────────────────────────────────────────────
  private normalizeStatus(status: string): string {
    return (status ?? '').trim().toLowerCase();
  }

  // Returns the modifier class defined in the SCSS (.status-pill--*)
  getStatusClass(status: string): string {
    switch (this.normalizeStatus(status)) {
      case 'pending':          return 'status-pill--pending';
      case 'confirmed':        return 'status-pill--confirmed';
      case 'ready for pickup': return 'status-pill--ready';
      case 'returned':         return 'status-pill--returned';
      case 'overdue':          return 'status-pill--overdue';
      default:                 return '';
    }
  }

  getStatusStep(status: string): number {
    const normalized = this.normalizeStatus(status);

    // Overdue = items are out with the customer, so the tracker sits on the pickup step
    if (normalized === 'overdue') return 3;

    const idx = this.statusOrder.indexOf(normalized);
    return idx === -1 ? 1 : idx + 1;
  }

  getStockStatus(clothe: ClotheDTO): 'available' | 'low' | 'out' {
    if (clothe.availableQuantity === 0) return 'out';
    if (clothe.availableQuantity <= clothe.stockQuantity * 0.2) return 'low';
    return 'available';
  }

  imgErrors: Set<number> = new Set();
  onImgError(id: number): void { this.imgErrors.add(id); }
  hasImgError(id: number): boolean { return this.imgErrors.has(id); }

  // The server already filters by category, so this just returns the list.
  get filteredClothes(): ClotheDTO[] {
    return this.featuredClothes;
  }

  private toTitleCase(value: string): string {
    const trimmed = (value ?? '').trim();
    if (!trimmed) return '';
    return trimmed
      .toLowerCase()
      .replace(/\b\w/g, ch => ch.toUpperCase());
  }
}