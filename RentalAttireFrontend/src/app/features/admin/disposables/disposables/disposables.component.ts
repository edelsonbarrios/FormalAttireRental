import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DisposablesService } from '../disposables-service/disposables.service';
import { AppToastrService } from '../../../../core/services/toastr-service/app-toastr.service';
import { UserService } from '../../../../core/services/user-service/user.service';
import { UserViewModel } from '../../../../data/models/DTOs/Users/user-view-model';
import { ArchivedEntity } from '../../../../data/models/DTOs/Disposables/archive-entity';
import { ViewRecordComponent } from "../view-record/view-record.component";
import { RestoreRecordCommand } from '../DTOs/restore-record-command';
// ─────────────────────────────────────────────────────────────

@Component({
  selector: 'app-disposables',
  standalone: true,
  imports: [CommonModule, FormsModule, ViewRecordComponent],
  templateUrl: './disposables.component.html',
  styleUrl: './disposables.component.scss',
})
export class DisposablesComponent implements OnInit {

  // ============================================================
  // State
  // ============================================================
  isLoading = false;
  records: ArchivedEntity[] = [];

  // ── Search & Filter ────────────────────────────────────────
  searchQuery = '';
  filterType  = ''; // 'Employee' | 'Customer' | 'Clothe' | 'Category' | ''

  // ── Pagination ─────────────────────────────────────────────
  currentPage  = 1;
  itemsPerPage = 10;
  totalCount   = 0;
  totalPages   = 1;

  // ── Confirmation modal ─────────────────────────────────────
  pendingRecord: ArchivedEntity | null     = null;
  pendingAction: 'restore' | 'delete' | null  = null;
  isConfirming = false;

  // ── View modal ─────────────────────────────────────────────
  recordToView: ArchivedEntity | null = null;

  // ── Current user ───────────────────────────────────────────
  currentUser: UserViewModel | undefined;

  constructor(
    private disposablesService: DisposablesService,
    private toastrService: AppToastrService,
    private userService: UserService,
  ) {}

  ngOnInit(): void {
    this.getCurrentUser();
    this.getAllArchivedRecords();
  }


  // ============================================================
  // Data Loading
  // ============================================================
  getAllArchivedRecords(): void {
    this.isLoading = true;

    this.disposablesService
      .getAllArchivedRecordsAsync(this.currentPage, this.itemsPerPage)
      .then((res) => {
        if (!res.isSuccess) {
          this.records    = [];
          this.totalCount = 0;
          this.totalPages = 1;
          this.toastrService.error(res.errorMessage ?? 'Records could not be fetched.');
          return;
        }
        this.records    = res.data?.items ?? [];
        this.totalCount = res.data?.totalCount ?? 0;
        this.totalPages = res.data?.totalPages ?? 1;
      })
      .catch((err) => {
        this.toastrService.error(err.error);
      })
      .finally(() => {
        this.isLoading = false;
      });
  }


  // ============================================================
  // Search & Filter
  // ============================================================
  get filteredRecords(): ArchivedEntity[] {
    let list = this.records;
    if (this.filterType)
      list = list.filter((r) => r.entityType === this.filterType);
    if (this.searchQuery.trim())
      list = list.filter(
        (r) =>
          r.entityType.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          r.archivedBy.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          r.entityId.toString().includes(this.searchQuery),
      );
    return list;
  }

  get hasActiveFilters(): boolean {
    return !!this.searchQuery.trim() || !!this.filterType;
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.filterType  = '';
  }

  // ── Per-type counts ────────────────────────────────────────
  get employeeCount(): number { return this.records.filter((r) => r.entityType === 'Employee').length; }
  get customerCount(): number { return this.records.filter((r) => r.entityType === 'Customer').length; }
  get clotheCount():   number { return this.records.filter((r) => r.entityType === 'Clothe').length; }
  get categoryCount(): number { return this.records.filter((r) => r.entityType === 'Category').length; }


  // ============================================================
  // Pagination
  // ============================================================
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.getAllArchivedRecords();
  }

  get rangeStart(): number {
    return Math.min((this.currentPage - 1) * this.itemsPerPage + 1, this.totalCount);
  }

  get rangeEnd(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalCount);
  }

  get pageNumbers(): number[] {
    const total = this.totalPages, current = this.currentPage;
    const range: number[] = [], pages: number[] = [];
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++)
      range.push(i);
    pages.push(1);
    if (range.length > 0 && range[0] > 2) pages.push(-1);
    pages.push(...range);
    if (range.length > 0 && range[range.length - 1] < total - 1) pages.push(-1);
    if (total > 1) pages.push(total);
    return pages;
  }


  // ============================================================
  // View Modal
  // ============================================================
  openViewModal(record: ArchivedEntity): void {
    this.recordToView = record; 
  }
  closeViewModal(): void                          { this.recordToView = null; }


  // ============================================================
  // Confirmation Modal
  // ============================================================
  openConfirm(record: ArchivedEntity, action: 'restore' | 'delete'): void {
    this.pendingRecord = record;
    this.pendingAction = action;
  }

  closeConfirm(): void {
    this.pendingRecord = null;
    this.pendingAction = null;
  }

  onConfirmed(): void {
    if (!this.pendingRecord || !this.pendingAction) return;

    if(this.pendingAction == 'delete') {
      this.isLoading = true;

      this.disposablesService.deleteRecordAsync(
        this.pendingRecord.entityId,
        this.pendingRecord.entityType,
        this.currentUser?.fullName ?? '',
        this.currentUser?.id ?? 0
      ).then(res => {
        if(!res.isSuccess)
          this.toastrService.error(res.errorMessage ?? 'Record could not be deleted.');
        this.toastrService.success(res.successMessage ?? 'Record permanently deleted.');
      }).catch(err => {
        this.toastrService.error(err.error);
      }).finally(() => {
        this.isLoading = false;
        this.pendingRecord = null;
        this.getAllArchivedRecords();
      });
    }

    if(this.pendingAction == 'restore') {
      this.isLoading = true;

      const payload : RestoreRecordCommand = {
        entityType : this.pendingRecord.entityType,
        id : this.pendingRecord.entityId,
        performedBy : this.currentUser?.fullName ?? '',
        performedById : this.currentUser?.id ?? 0
      };

      this.disposablesService.restoreRecordAsync(
        payload
      ).then(res => {
        if(!res.isSuccess) {
          this.toastrService.error(res.errorMessage ?? 'Record could not be restored.');
          return;
        }
        this.toastrService.success(res.successMessage ?? 'Record successfully restored.');
      }).catch(err => {
        this.toastrService.error(err.error);
      }).finally(() => {
        this.isLoading = false;
        this.pendingRecord = null;
        this.getAllArchivedRecords();
      })
    }
  }




  // ============================================================
  // Helpers
  // ============================================================
  getEntityIcon(entityType: string): string {
    const map: Record<string, string> = {
      Employee: 'person',
      Customer: 'customer',
      Clothe:   'clothe',
      Category: 'category',
    };
    return map[entityType] ?? 'default';
  }

  getEntityTypeClass(entityType: string): string {
    const map: Record<string, string> = {
      Employee: 'type--employee',
      Customer: 'type--customer',
      Clothe:   'type--clothe',
      Category: 'type--category',
    };
    return map[entityType] ?? '';
  }

  getCurrentUser(): void {
    this.isLoading = true;
    this.userService
      .getCurrentUserViewModel()
      .then((res) => {
        if (!res.isSuccess)
        this.currentUser = res.data ?? undefined;
      })
      .catch((err) => {
        this.toastrService.error(err.error);
      })
      .finally(() => {
        this.isLoading = false;
      });
  }
}