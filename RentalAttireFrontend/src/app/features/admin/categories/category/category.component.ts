import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../category-service/category.service';
import { ToastrService } from 'ngx-toastr';
import { ArchiveConfirmationComponent } from '../../../../shared/components/archive-confirmation/archive-confirmation/archive-confirmation.component';
import { Category } from '../../../../data/models/DTOs/Category/category';
import { ArchiveCategoryCommand } from '../../../../data/models/DTOs/Category/archive-category-command';
import { UserService } from '../../../../core/services/user-service/user.service';
import { UserViewModel } from '../../../../data/models/DTOs/Users/user-view-model';
import { CreateCategoryCommand } from '../../../../data/models/DTOs/Category/create-category';
import { EditCategoryComponent } from '../edit-category/edit-category.component';
// TODO: replace with your actual imports
// import { Category } from '../../../../data/models/DTOs/Categories/category';
// import { CategoryService } from '../category-service/category.service';
// import { AppToastrService } from '../../../../core/services/toastr-service/app-toastr.service';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    ArchiveConfirmationComponent,
    EditCategoryComponent
  ],
  templateUrl: './category.component.html',
  styleUrl: './category.component.scss',
})
export class CategoryComponent implements OnInit {

  // ============================================================
  // State
  // ============================================================
  isLoading    = false;
  isSubmitting = false;
  categories: Category[] = [];
  currentUser : UserViewModel | undefined;

  // ── Inline create form ─────────────────────────────────────
  // showCreateRow flips to true when the user clicks "+ Add Category"
  showCreateRow = false;
  createTouched = false;

  newCategory: Category = new Category();

  // ── Edit modal ─────────────────────────────────────────────
  categoryToEdit: Category | null = null;

  // ── Archive confirmation ───────────────────────────────────
  categoryToArchive: Category | undefined = undefined;
  isArchiving = false;

  // ── Search & Pagination ────────────────────────────────────
  searchQuery  : string = '';
  currentPage  = 1;
  itemsPerPage = 10;
  totalCount   = 0;
  totalPages   = 1;

  // constructor(
  //   private categoryService: CategoryService,
  //   private toastr: AppToastrService,
  // ) {}

  constructor(
    private categoryService : CategoryService,
    private toastrService : ToastrService,
    private userService : UserService
  ) {}

  ngOnInit(): void {
    this.getCurrentUser();
    this.getAllCategories();
  }

  // ============================================================
  // Data Loading — TODO: wire to your CategoryService
  // ============================================================
  getAllCategories(): void {
    this.isLoading = true;
    this.categoryService.filterCategoriesAsync(
      this.searchQuery,
      this.currentPage,
      this.itemsPerPage
    ).then(res => {
      if(!res.isSuccess)
        this.toastrService.error(`${res.errorMessage ?? 'Categories not found.'}`);
      this.categories = res.data?.items ?? [];
      this.totalCount = res.data?.totalCount ?? 1;
      this.totalPages = res.data?.totalPages ?? 1;
    }).catch(err => {
    }).finally(() => {
      this.isLoading = false;
    });
  }

  getCurrentUser() {
    this.isLoading = true;
    this.userService.getCurrentUserViewModel()
    .then(res => {
      if(!res.isSuccess)
        this.toastrService.error(res.errorMessage ?? 'Current user could not be fetched.');
      this.currentUser = res.data ?? undefined;
    }).catch(err => {
      this.toastrService.error(err.error);
    }).finally(() => {
      this.isLoading = false;
    })
  }

  // ============================================================
  // Search
  // ============================================================
  onSearch(): void {
    this.currentPage = 1;
    this.getAllCategories();
  }

  // ============================================================
  // Inline Create Form
  // ============================================================

  // Validation for the inline create form
  get createErrors(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!this.newCategory.categoryCode?.trim()) e['categoryCode'] = 'Code is required.';
    if (!this.newCategory.categoryName?.trim()) e['categoryName'] = 'Name is required.';
    return e;
  }

  get createIsValid(): boolean {
    return Object.keys(this.createErrors).length === 0;
  }

  hasCreateError(field: string): boolean {
    return this.createTouched && !!this.createErrors[field];
  }

  openCreateRow(): void {
    this.newCategory   = new Category();
    this.createTouched = false;
    this.showCreateRow = true;
  }

  cancelCreate(): void {
    this.showCreateRow = false;
    this.createTouched = false;
    this.newCategory   = new Category();
  }

  saveCategory(): void {
    this.createTouched = true;
    if (!this.createIsValid) return;

    this.isSubmitting = true;

    const payload : CreateCategoryCommand = {
      id : this.newCategory.id,
      categoryCode : this.newCategory.categoryCode,
      categoryName : this.newCategory.categoryName,
      description : this.newCategory.description,
      performedBy : this.currentUser?.fullName ?? '',
      performedById : this.currentUser?.id ?? 0
    };
    
    this.categoryService.createCategoryAsync(payload)
    .then(res => {
      if(!res.isSuccess)
        this.toastrService.error(res.errorMessage ?? 'Category cannot be created.');
      this.getAllCategories();
      this.toastrService.success(res.successMessage);
    }).catch(err => {
      this.toastrService.error(err.error);
    }).finally(() =>  {
      this.isLoading = false;
      this.isSubmitting = false;
      this.cancelCreate();
    });
  }

  // ============================================================
  // Edit Modal
  // ============================================================
  openEditModal(category: Category): void {
    // Deep copy so edits don't affect the list until saved
    this.categoryToEdit = { ...category };
  }

  closeEditModal(): void {
    this.categoryToEdit = null;
  }

  onCategoryUpdated(updated: Category): void {
    const index = this.categories.findIndex(c => c.id === updated.id);
    if (index !== -1) this.categories[index] = updated;

    this.categoryToEdit = null;
    this.toastrService.success('Category successfully updated.');
  }

  // ============================================================
  // Archive
  // ============================================================
  openArchiveModal(category: Category): void {
    this.categoryToArchive = category;
  }

  closeArchiveModal(): void {
    this.categoryToArchive = undefined;
  }

  onArchiveConfirmed(): void {
    if (!this.categoryToArchive) return;
    this.isArchiving = true;

    const payload : ArchiveCategoryCommand = {
      id: this.categoryToArchive.id,
      performedBy : this.currentUser?.fullName ?? '',
      performedById : this.currentUser?.id ?? 0
    };

    this.categoryService.archiveCategoryByIdAsync(payload)
    .then(res => {
      if(!res.isSuccess)
        this.toastrService.error(res.errorMessage ?? 'Category could not be archived.');
      this.toastrService.success(res.successMessage);
    }).catch(err => {
      this.toastrService.error(err.error);
    }).finally(() => {
      this.isArchiving = false;
      this.closeArchiveModal();
      this.getAllCategories();
    });
  }

  // ============================================================
  // Pagination
  // ============================================================
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.getAllCategories();
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
}