import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClotheDTO } from '../../../../data/models/DTOs/Clothes/clothes';
import { SupplierService } from '../suppliers-service/supplier.service';
import { CategoryService } from '../../categories/category-service/category.service';
import { Category } from '../../../../data/models/DTOs/Category/category';
import { AppToastrService } from '../../../../core/services/toastr-service/app-toastr.service';

@Component({
  selector: 'app-view-supplier-clothes-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './view-supplier-clothes-modal.component.html',
  styleUrl: './view-supplier-clothes-modal.component.scss'
})
export class ViewSupplierClothesModalComponent implements OnInit {

  @Input() supplierId : number | null = null;
  @Input() supplierName = '';
  @Output() closeModal = new EventEmitter<void>();

  // ── Filters — all now sent to the backend ───────────────────────────────
  searchQuery = '';
  genderFilter = '';       // '', 'Male', 'Female', 'Unisex'
  availabilityFilter = ''; // '', 'Available', 'Out of stock'
  categoryFilter = '';     // '', or a categoryName

  categories: Category[] = [];

  // ── Server-filtered, server-paginated result — single source of truth ──
  clothes: ClotheDTO[] = [];
  totalCount = 0;
  totalPages = 0;

  // ── Pagination ───────────────────────────────────────────────────────
  currentPage = 1;
  itemsPerPage = 8;

  constructor(
    private supplierService : SupplierService,
    private categoryService : CategoryService,
    private toastrService : AppToastrService
  ) {}

  get rangeStart(): number {
    if (this.totalCount === 0) return 0;
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalCount);
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    const current = this.currentPage;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    if (current > 3) pages.push(-1);
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push(-1);
    pages.push(total);

    return pages;
  }

  ngOnInit(): void {
    this.fetchClothes();
    this.loadCategories();
  }

  private loadCategories(): void {
    this.categoryService.getAllCategories().then(res => {
      if (res.isSuccess && res.data) {
        this.categories = res.data;
      }
    }).catch(err => {
      this.toastrService.error(err.error);
    });
  }

  fetchClothes(): void {
    this.supplierService.getSupplierClothesByIdAsync(
      this.supplierId ?? 0,
      this.currentPage,
      this.itemsPerPage,
      this.searchQuery,
      this.categoryFilter,
      this.availabilityFilter,
      this.genderFilter
    ).then(res => {
      if (!res.isSuccess || !res.data) {
        this.clothes = [];
        this.totalCount = 0;
        this.totalPages = 0;
        return;
      }

      this.clothes = res.data.items;
      this.totalCount = res.data.totalCount;
      this.totalPages = res.data.totalPages;
    }).catch(err => {
      this.toastrService.error(err.error);
    });
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.fetchClothes();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.fetchClothes();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.fetchClothes();
  }

  // ── Modal ──────────────────────────────────────────────────────────────
  close(): void {
    this.closeModal.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close();
    }
  }
}