import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ClotheDTO } from '../../../../data/models/DTOs/Clothes/clothes';
import { Category } from '../../../../data/models/DTOs/Category/category';
import { ClotheService } from '../../../admin/clothes/clothe-service/clothe.service';
import { CategoryService } from '../../../admin/categories/category-service/category.service';
import { CartService } from '../cart.service';
import { ViewClotheModalComponent } from '../view-clothe-modal/view-clothe-modal.component';

@Component({
  selector: 'app-browse',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ViewClotheModalComponent
  ],
  templateUrl: './browse.component.html',
  styleUrl: './browse.component.scss',
})
export class BrowseComponent implements OnInit {

  // ============================================================
  // State
  // ============================================================
  isLoading = false;
  clothes: ClotheDTO[] = [];

  // ── Search & Filters ───────────────────────────────────────
  searchQuery    = '';
  filterCategory = '';
  filterGender   = '';

  // ── Pagination ─────────────────────────────────────────────
  currentPage  = 1;
  itemsPerPage = 12;
  totalCount   = 0;
  totalPages   = 1;

  // ── Modal ──────────────────────────────────────────────────
  clotheToView: ClotheDTO | null = null;

  // ── Dropdown options ───────────────────────────────────────
  categories: Category[] = [];
  genders: string[] = ['Male', 'Female', 'Unisex'];

  constructor(
    private clotheService: ClotheService,
    private categoryService: CategoryService,
    private cartService: CartService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.getAllClothes();
    this.getAllCategories();
  }

  // ============================================================
  // Data Loading
  // ============================================================
  getAllClothes(): void {
    this.isLoading = true;

    this.clotheService.filterClothesAsync(
      this.searchQuery,
      '',
      this.filterGender,
      this.filterCategory,
      this.currentPage,
      this.itemsPerPage,
    ).then(res => {
      this.clothes = res.data?.items ?? [];
      this.totalCount = res.data?.totalCount ?? 0;
      this.totalPages = res.data?.totalPages ?? 0;
    }).catch(err => {
      this.toastr.error(err.error);
    }).finally(() => this.isLoading = false);
  }

  getAllCategories(): void {
    this.categoryService.getAllCategories()
    .then(res => {
      if (!res.isSuccess)
        this.toastr.error(res.errorMessage ?? 'Failed to load categories.');
      this.categories = res.data ?? [];
    }).catch(err => {
    });
  }

  // ============================================================
  // Search & Filter
  // ============================================================
  onSearch(): void {
    this.currentPage = 1;
    this.getAllClothes();
  }

  // Called by sidebar checkboxes
  setCategory(value: string): void {
    this.filterCategory = value;
    this.currentPage = 1;
    this.getAllClothes();
  }

  setGender(value: string): void {
    this.filterGender = value;
    this.currentPage = 1;
    this.getAllClothes();
  }

  get hasActiveFilters(): boolean {
    return !!this.searchQuery.trim() || !!this.filterCategory || !!this.filterGender;
  }

  clearFilters(): void {
    this.searchQuery    = '';
    this.filterCategory = '';
    this.filterGender   = '';
    this.currentPage    = 1;
    this.getAllClothes();
  }

  // ============================================================
  // Pagination
  // ============================================================
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.getAllClothes();
  }

  get rangeStart(): number {
    return Math.min((this.currentPage - 1) * this.itemsPerPage + 1, this.totalCount);
  }

  get rangeEnd(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalCount);
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

  // ============================================================
  // Modal Handlers
  // ============================================================
  openViewModal(c: ClotheDTO): void { this.clotheToView = c; }
  closeViewModal(): void            { this.clotheToView = null; }

  // ============================================================
  // Cart
  // ============================================================
  onAddToCart(c: ClotheDTO): void {
    if (this.getStockStatus(c) === 'out') return;
    // CartService now owns the stock-limit check and the
    // success/warning toast for it — don't duplicate the message here.
    this.cartService.addToCart(c, 1);
  }

  onAddToCartFromModal(payload: { clothe: ClotheDTO; quantity: number }): void {
    this.cartService.addToCart(payload.clothe, payload.quantity);
    this.closeViewModal();
  }

  isInCart(clotheId: number): boolean {
    return this.cartService.isInCart(clotheId);
  }

  // ============================================================
  // Helpers
  // ============================================================
  getStockStatus(c: ClotheDTO): 'available' | 'low' | 'out' {
    if (c.availableQuantity === 0) return 'out';
    if (c.availableQuantity <= c.stockQuantity * 0.2) return 'low';
    return 'available';
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}