import { CommonModule, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RentalDTO } from '../../../../data/models/DTOs/Rentals/rental';
import { MyRentalService } from '../my-rental-service/my-rental.service';
import { ToastrService } from 'ngx-toastr';
import { MessageModalComponent, MessageModalType, MessageModalVariant } from '../../../../shared/components/message-modal/message-modal.component';
import { RentalItemDTO } from '../../../../data/models/DTOs/Rentals/rental-item';
import { ViewRentalComponent } from "../view-rental/view-rental.component";

type RentalTab = 'active' | 'completed' | 'declined';

@Component({
  selector: 'app-my-rentals',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MessageModalComponent, ViewRentalComponent, NgIf],
  templateUrl: './my-rental.component.html',
  styleUrl: './my-rental.component.scss',
})
export class MyRentalsComponent implements OnInit {

  rentals: RentalDTO[] = [];
  isLoading = false;
  searchQuery: string = '';
  totalCount: number = 0;

  activeTab: RentalTab = 'active';

  openViewRental = false;
  rentalToView : RentalDTO | null = null;

  // ── Pagination ──
  currentPage = 1;
  itemsPerPage = 8;

  startingDate?: string;
  endingDate?: string;

  // ── Item thumbnails ──
  private readonly maxThumbnailItems = 3;

  // ── Progress tracker steps ──
  readonly statusSteps = ['Pending', 'Confirmed', 'Ready for Pickup', 'Returned'];

  // Canonical lowercase order used for matching — decoupled from however
  // the backend happens to capitalize the status string.
  private readonly statusOrder = ['pending', 'confirmed', 'ready for pickup', 'returned'];

  // Modal Message Parameters
  openMessageModal: boolean = false;
  variant: MessageModalVariant = 'neutral';
  type: MessageModalType = 'info';
  title: string = '';
  message: string = '';

  constructor(
    private myRentalService: MyRentalService,
    private toastrService: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadCustomerRentals();
  }

  loadCustomerRentals() {
    this.isLoading = true;

    this.myRentalService.getCustomerRentalsAsync(
      this.searchQuery,
      this.activeTab,
      this.currentPage,
      this.itemsPerPage,
      this.startingDate,
      this.endingDate
    ).then(res => {
      this.isLoading = false;

      if (!res.isSuccess) {
        this.rentals = [];
        this.totalCount = 0;
        this.toastrService.error(res.errorMessage ?? 'No rentals currently found.');
        return;
      }

      this.rentals = res.data?.items ?? [];
      this.totalCount = res.data?.totalCount ?? 0;
    }).catch(err => {
      this.isLoading = false;
      this.type = 'info';
      this.variant = 'error';
      this.title = err?.detail?.title ?? 'Something went wrong';
      this.message = err?.error ?? 'Failed to load your rentals. Please try again.';
      this.openMessageModal = true;
    });
  }

  closeMessageModal(): void {
    this.openMessageModal = false;
  }

  // ============================================================
  // Tabs
  // ============================================================
  setTab(tab: RentalTab): void {
    this.activeTab = tab;
    this.currentPage = 1;
    this.loadCustomerRentals();
  }

  get isEmpty(): boolean {
    return !this.isLoading && this.rentals.length === 0;
  }

  get emptyStateTitle(): string {
    switch (this.activeTab) {
      case 'active':    return 'No active rentals';
      case 'completed': return 'No completed rentals yet';
      case 'declined':  return 'No declined reservations';
      default:          return 'Nothing here yet';
    }
  }

  get emptyStateSubtitle(): string {
    switch (this.activeTab) {
      case 'active':    return "You don't have any pending or ongoing rentals right now.";
      case 'completed': return 'Rentals you\'ve returned will show up here.';
      case 'declined':  return 'Good news — none of your reservations were declined.';
      default:          return '';
    }
  }

  // ============================================================
  // Search & Date Filters
  // ============================================================
  onSearch(): void {
    this.currentPage = 1;
    this.loadCustomerRentals();
  }

  get hasActiveFilters(): boolean {
    return !!this.searchQuery.trim() || !!this.startingDate || !!this.endingDate;
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.startingDate = undefined;
    this.endingDate = undefined;
    this.currentPage = 1;
    this.loadCustomerRentals();
  }

  // ============================================================
  // Item avatar stack
  // ============================================================
  private itemsWithImages(rental: RentalDTO): RentalItemDTO[] {
    return rental.rentalItems.filter(item => !!item.clothe.profileImagePath);
  }

  getThumbnailItems(rental: RentalDTO): RentalItemDTO[] {
    return this.itemsWithImages(rental).slice(0, this.maxThumbnailItems);
  }

  getExtraItemsCount(rental: RentalDTO): number {
    return Math.max(0, this.itemsWithImages(rental).length - this.maxThumbnailItems);
  }

  // ============================================================
  // Status matching — normalized so casing differences between
  // frontend and backend can't silently break a badge/tracker step.
  // ============================================================
  private normalizeStatus(status: string): string {
    return (status ?? '').trim().toLowerCase();
  }

  isPending(rental: RentalDTO): boolean {
    return this.normalizeStatus(rental.status) === 'pending';
  }

  isDeclined(rental: RentalDTO): boolean {
    return this.normalizeStatus(rental.status) === 'declined';
  }

  isReturned(rental: RentalDTO): boolean {
    return this.normalizeStatus(rental.status) === 'returned';
  }

  getStatusStep(status: string): number {
    const idx = this.statusOrder.indexOf(this.normalizeStatus(status));
    return idx === -1 ? 0 : idx + 1;
  }

  badgeClass(rental: RentalDTO): string {
    switch (this.normalizeStatus(rental.status)) {
      case 'pending':           return 'status-badge--pending';
      case 'confirmed':         return 'status-badge--confirmed';
      case 'ready for pickup':  return 'status-badge--ready';
      case 'returned':          return 'status-badge--returned';
      case 'declined':          return 'status-badge--declined';
      default:                  return '';
    }
  }

  // ============================================================
  // Actions
  // ============================================================
  viewDetails(rental: RentalDTO): void {
    this.rentalToView = rental;
    this.openViewRental = true;
    
  }

  closeViewRentalModal() {
    this.openViewRental = false;
    this.rentalToView = null;
  }

  trackByRental(index: number, rental: RentalDTO): number {
    return rental.id;
  }

  // ============================================================
  // Pagination — same ellipsis pattern used in BrowseComponent
  // ============================================================
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.itemsPerPage));
  }

  get paginatedRentals(): RentalDTO[] {
    return this.rentals;
  }

  get pageNumbers(): number[] {
    const total   = this.totalPages;
    const current = this.currentPage;
    const range: number[] = [];
    const pages: number[] = [];

    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      range.push(i);
    }

    pages.push(1);
    if (range.length > 0 && range[0] > 2) pages.push(-1);
    pages.push(...range);
    if (range.length > 0 && range[range.length - 1] < total - 1) pages.push(-1);
    if (total > 1) pages.push(total);

    return pages;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.loadCustomerRentals();
  }
}