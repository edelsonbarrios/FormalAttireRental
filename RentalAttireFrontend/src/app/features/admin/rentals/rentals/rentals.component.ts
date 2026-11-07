import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RentalsService } from '../rentals.service';
import { RentalDTO } from '../../../../data/models/DTOs/Rentals/rental';
import { RentalStatus } from '../../../../data/models/DTOs/Rentals/rental-status';
import { MessageModalComponent, MessageModalType, MessageModalVariant } from '../../../../shared/components/message-modal/message-modal.component';
import { ViewRentalComponent } from '../view-rental/view-rental.component';

const STATUS_OPTIONS: RentalStatus[] = [
  'Pending', 
  'Confirmed', 
  'Ready for pickup', 
  'Returned', 'Declined', 
  'Overdue'
];

// Only these transitions are allowed from a given current status
const NEXT_STATUS: Partial<Record<RentalStatus, RentalStatus[]>> = {
  Pending: ['Confirmed', 'Declined'],
  Confirmed: ['Ready for pickup'],
  'Ready for pickup': ['Returned'],
};

type PendingAction = { rental: RentalDTO; nextStatus: RentalStatus } | null;

@Component({
  selector: 'app-rentals',
  standalone: true,
  imports: [CommonModule, FormsModule, MessageModalComponent, ViewRentalComponent],
  templateUrl: './rentals.component.html',
  styleUrl: './rentals.component.scss',
})
export class RentalsComponent implements OnInit {

  rentals: RentalDTO[] = [];
  isLoading = true;

  // stats (computed server-side, independent of current page/filters)
  totalRevenue = 0;
  statusCounts: Partial<Record<RentalStatus, number>> = {};
  overdueCount = 0;
  dueSoonCount = 0;

  // filters
  searchQuery = '';
  statusFilter = '';
  startingDate = '';
  endingDate = '';
  statusOptions = STATUS_OPTIONS;
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  // Guards the "retry once with cleared filters" recovery so it can never loop
  private isRecovering = false;

  // pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalCount = 0;
  totalPages = 1;

  // confirm-step modal
  modalOpen = false;
  modalType: MessageModalType = 'confirm';
  modalVariant: MessageModalVariant = 'neutral';
  modalTitle = '';
  modalMessage = '';
  private pendingAction: PendingAction = null;
  updatingRentalId: number | null = null;

  // feedback modal (result of the action)
  feedbackOpen = false;
  feedbackVariant: MessageModalVariant = 'success';
  feedbackTitle = '';
  feedbackMessage = '';

  // view-rental modal
  rentalToView: RentalDTO | null = null;

  constructor(private rentalService: RentalsService) {}

  ngOnInit(): void {
    this.loadRentals();
  }

  async loadRentals(): Promise<void> {
    this.isLoading = true;

    const result = await this.rentalService.filterRentals({
      status: this.statusFilter || undefined,
      searchQuery: this.searchQuery || undefined,
      startingDate: this.startingDate || undefined,
      endingDate: this.endingDate || undefined,
      currentPage: this.currentPage,
      itemsPerPage: this.itemsPerPage,
    });

    this.isLoading = false;

    if (!result.isSuccess || !result.data) {
      this.rentals = [];
      this.totalCount = 0;
      this.totalPages = 1;
      this.totalRevenue = 0;
      this.statusCounts = {};
      this.overdueCount = 0;
      this.dueSoonCount = 0;

      this.showFeedback('error', 'Failed to Load', result.errorMessage ?? 'Failed to load rentals.');

      // If active filters may have caused the failure, retry ONCE with them
      // cleared. The guard stops this from calling itself forever.
      if (this.hasActiveFilters && !this.isRecovering) {
        this.isRecovering = true;
        this.resetFilterFields();
        await this.loadRentals();
        this.isRecovering = false;
      }
      return;
    }

    this.rentals = result.data.items;
    this.totalCount = result.data.totalCount;
    this.totalRevenue = result.data.totalRevenue;
    this.statusCounts = result.data.statusCounts;
    this.overdueCount = result.data.overdueCount;
    this.dueSoonCount = result.data.dueSoonCount;
    this.totalPages = Math.max(1, Math.ceil(this.totalCount / this.itemsPerPage));
  }

  // === filters ===
  onSearchChange(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.currentPage = 1;
      this.loadRentals();
    }, 300);
  }

  onSearchEnter(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.currentPage = 1;
    this.loadRentals();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadRentals();
  }

  filterByStatus(status: RentalStatus): void {
    this.statusFilter = this.statusFilter === status ? '' : status;
    this.onFilterChange();
  }

  get hasActiveFilters(): boolean {
    return !!this.searchQuery || !!this.statusFilter || !!this.startingDate || !!this.endingDate;
  }

  // Resets the filter inputs only — does not reload
  private resetFilterFields(): void {
    this.searchQuery = '';
    this.statusFilter = '';
    this.startingDate = '';
    this.endingDate = '';
    this.currentPage = 1;
  }

  clearFilters(): void {
    this.resetFilterFields();
    this.loadRentals();
  }

  // === pagination ===
  get rangeStart(): number {
    return Math.min((this.currentPage - 1) * this.itemsPerPage + 1, this.totalCount);
  }
  get rangeEnd(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalCount);
  }
  get pageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      if (i === 1 || i === this.totalPages || Math.abs(i - this.currentPage) <= 1) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== -1) {
        pages.push(-1);
      }
    }
    return pages;
  }
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.loadRentals();
  }

  // === status transitions ===
  nextStatusOptions(rental: RentalDTO): RentalStatus[] {
    return NEXT_STATUS[rental.status] ?? [];
  }

  promptStatusChange(rental: RentalDTO, nextStatus: RentalStatus): void {
    this.pendingAction = { rental, nextStatus };
    this.modalType = 'confirm';
    this.modalVariant = nextStatus === 'Declined' ? 'error' : 'success';
    this.modalTitle = `Mark as ${nextStatus}?`;
    this.modalMessage = this.confirmMessageFor(rental.rentalCode, nextStatus);
    this.modalOpen = true;
  }

  private confirmMessageFor(rentalCode: string, nextStatus: RentalStatus): string {
    switch (nextStatus) {
      case 'Confirmed':
        return `Confirm rental ${rentalCode}? This will deduct stock for the reserved items.`;
      case 'Declined':
        return `Decline rental ${rentalCode}? Reserved stock will be released.`;
      case 'Ready for pickup':
        return `Mark rental ${rentalCode} as ready for pickup?`;
      case 'Returned':
        return `Mark rental ${rentalCode} as returned? The deposit will be considered settled.`;
      default:
        return `Update rental ${rentalCode} to ${nextStatus}?`;
    }
  }

  async onModalConfirmed(): Promise<void> {
    this.modalOpen = false;
    if (!this.pendingAction) return;

    const { rental, nextStatus } = this.pendingAction;
    this.pendingAction = null;
    this.updatingRentalId = rental.id;

    const result = await this.rentalService.updateRentalStatus(rental.id, nextStatus);

    this.updatingRentalId = null;

    if (!result.isSuccess) {
      this.showFeedback('error', 'Update Failed', result.errorMessage ?? 'Failed to update rental status.');
      return;
    }

    rental.status = nextStatus;
    this.showFeedback('success', 'Updated', `Rental ${rental.rentalCode} marked as ${nextStatus}.`);
    this.loadRentals(); // refresh stats (statusCounts, revenue) to reflect the change
  }

  onModalClosed(): void {
    this.modalOpen = false;
    this.pendingAction = null;
  }

  private showFeedback(variant: MessageModalVariant, title: string, message: string): void {
    this.feedbackVariant = variant;
    this.feedbackTitle = title;
    this.feedbackMessage = message;
    this.feedbackOpen = true;
  }

  onFeedbackClosed(): void {
    this.feedbackOpen = false;
  }

  // === view-rental modal ===
  openViewModal(rental: RentalDTO): void {
    this.rentalToView = rental;
  }

  closeViewModal(): void {
    this.rentalToView = null;
  }

  onViewRentalUpdated(): void {
    // ViewRentalComponent already emits (closed) alongside this on success,
    // so we only need to refresh the table's data + stats here.
    this.loadRentals();
  }

  // === display helpers ===
  statusClass(status: RentalStatus): string {
    return 'status-' + status.toLowerCase().replace(/\s+/g, '-');
  }

  isOverdue(rental: RentalDTO): boolean {
    if (!rental.returnDate) return false;
    if (rental.status !== 'Confirmed' && rental.status !== 'Ready for pickup') return false;
    return new Date(rental.returnDate) < new Date(new Date().toDateString());
  }

  isDueSoon(rental: RentalDTO): boolean {
    if (this.isOverdue(rental) || !rental.returnDate) return false;
    if (rental.status !== 'Confirmed' && rental.status !== 'Ready for pickup') return false;
    const today = new Date(new Date().toDateString());
    const edge = new Date(today);
    edge.setDate(today.getDate() + 7);
    const returnDate = new Date(rental.returnDate);
    return returnDate >= today && returnDate <= edge;
  }
}