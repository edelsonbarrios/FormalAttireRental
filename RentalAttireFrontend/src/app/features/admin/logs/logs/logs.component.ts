import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuditLog } from '../../../../data/models/DTOs/AuditLogs/audit-log';
import { AuditLogService } from '../audit-log-service/audit-log.service';
import { ToastrService } from 'ngx-toastr';
import { range } from 'rxjs';

// TODO: Replace with your actual Log DTO
// export interface LogDTO {
//   id: number;
//   actionType: 'Login' | 'Create' | 'Update' | 'Archive';
//   message: string;
//   performedBy: string;
//   performedById: number;
//   timestamp: Date | string;
//   recordId?: number;
//   module?: string;
//   ipAddress?: string;
//   notes?: string;
// }

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './logs.component.html',
  styleUrl: './logs.component.scss',
})
export class LogsComponent implements OnInit {
  // ============================================================
  // CHALLENGE: Fill in all the logic below
  // ============================================================

  // ── State ──────────────────────────────────────────────────

  isLoading = false;
  isLive = false; // toggle this to show the live indicator

  logs: AuditLog[] = [];

  // ── Search & Filter ────────────────────────────────────────

  searchQuery = '';
  dateFrom = '';
  dateTo = '';
  activeFilter = 'all'; // 'all' | 'login' | 'create' | 'update' | 'archive'
  actionType = '';

  // ── Counts for filter pills ────────────────────────────────

  totalCount = 0;
  loginCount = 0;
  createCount = 0;
  updateCount = 0;
  archiveCount = 0;
  restoreCount = 0;

  // ── Pagination ─────────────────────────────────────────────

  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;

  // ── Expand / Collapse ──────────────────────────────────────

  expandedLogId: number | null = null;

  // ── Avatar colors (same palette as EmployeesComponent) ────

  private avatarColors = [
    '#a07840',
    '#7a9e7e',
    '#8b7aad',
    '#4a90a4',
    '#c0697a',
    '#6b8e6b',
    '#a0522d',
    '#5a7a9e',
  ];

  constructor(
    private auditService: AuditLogService,
    private toastr: ToastrService,
  ) {}

  // ============================================================
  // CHALLENGE 1: Load logs from your API on init
  // ============================================================
  // ngOnInit(): void { ... }
  ngOnInit(): void {
    this.getAllAuditLogs();
  }

  getAllAuditLogs() {
    const startingDate = this.dateFrom ? new Date(this.dateFrom) : undefined;
    const endingDate = this.dateTo ? new Date(this.dateTo) : undefined;

    this.auditService
      .getAllAuditLogs(
        this.actionType,
        this.searchQuery,
        this.currentPage,
        this.itemsPerPage,
        startingDate,
        endingDate,
      )
      .then((res) => {
        if (!res.isSuccess)
        this.logs = res.data?.logs ?? [];
        this.totalCount = res.data?.totalCount ?? 0;
        this.loginCount = res.data?.loginCount ?? 0;
        this.createCount = res.data?.createCount ?? 0;
        this.updateCount = res.data?.updateCount ?? 0;
        this.archiveCount = res.data?.archiveCount ?? 0;
        this.restoreCount = res.data?.restoreCount ?? 0;
        this.totalPages = res.data?.totalPages ?? 0;
      })
      .catch((err) => {
      });
  }

  // ============================================================
  // CHALLENGE 2: Search — called on every keystroke
  // ============================================================
  onSearch(): void {
    this.getAllAuditLogs();
  }

  // ============================================================
  // CHALLENGE 3: Date filter — called when date inputs change
  // ============================================================
  onDateFilter(): void {}

  toggleLive() {}

  // ============================================================
  // CHALLENGE 4: Filter pills — set active type and reload
  // ============================================================
  setFilter(filter: string): void {
    this.activeFilter = filter === '' ? '' : filter;
    this.actionType = filter;
    this.currentPage = 1;
    this.getAllAuditLogs();
  }

  // ============================================================
  // CHALLENGE 5: Pagination
  // ============================================================
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.getAllAuditLogs();
  }

  get rangeStart(): number {
    return Math.min(
      (this.currentPage - 1) * this.itemsPerPage + 1,
      this.totalCount,
    );
  } // TODO
  get rangeEnd(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalCount);
  } // TODO

  get pageNumbers(): number[] {
    const startingValue = Math.max(2, this.currentPage - 1);
    const conditionValue = Math.min(this.totalPages - 1, this.currentPage + 1);
    const ranges: number[] = [];
    const pages: number[] = [];

    for (let i = startingValue; i <= conditionValue; i++) {
      ranges.push(i);
    }

    pages.push(1);
    if (ranges.length > 0 && ranges[0] > 2) pages.push(-1);
    pages.push(...ranges);

    if (ranges.length > 0 && ranges[ranges.length - 1] < this.totalPages - 1)
      pages.push(-1);

    if (this.totalPages > 1) pages.push(this.totalPages);

    return pages;
  } // TODO — same pattern as EmployeesComponent

  // ============================================================
  // CHALLENGE 6: Expand / collapse a log row to show details
  // ============================================================
  toggleExpand(id: number): void {
    this.expandedLogId = this.expandedLogId === id ? null : id;
  }

  // ============================================================
  // CHALLENGE 7: Export logs (CSV or trigger API download)
  // ============================================================
  exportLogs(): void {}

  // ============================================================
  // Helper — avatar color by user ID
  // ============================================================
  getAvatarColor(id: number): string {
    return this.avatarColors[id % this.avatarColors.length];
  }

  getActionVerb(actionType: string): string {
    switch (actionType) {
      case 'Login':
        return 'logged into';
      case 'Create':
        return 'created a';
      case 'Update':
        return 'updated an';
      case 'Archived':
        return 'archived an';
      default:
        return 'performed action on';
    }
  }

  // True when any filter/search/date is active — shows the Clear Filters button
  get hasActiveFilters(): boolean {
    return (
      this.activeFilter !== 'all' ||
      this.searchQuery.trim() !== '' ||
      this.dateFrom !== '' ||
      this.dateTo !== ''
    );
  }

  // Resets all filters and reloads
  clearFilters(): void {
    this.activeFilter = 'all';
    this.actionType = '';
    this.searchQuery = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.currentPage = 1;
    this.getAllAuditLogs();
  }
}
