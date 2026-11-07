import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClotheDTO } from '../../../../data/models/DTOs/Clothes/clothes';
import { Category } from '../../../../data/models/DTOs/Category/category';
import { CategoryService } from '../../categories/category-service/category.service';
import { UserService } from '../../../../core/services/user-service/user.service';
import { UserViewModel } from '../../../../data/models/DTOs/Users/user-view-model';
import { ClotheService } from '../clothe-service/clothe.service';
import { ToastrService } from 'ngx-toastr';

// ── Edit command — same shape as ClotheDTO + audit + optional new image ──
export class UpdateClotheCommand extends ClotheDTO {
  performedBy: string   = '';
  performedById: number = 0;
  image: File | null    = null; // null = keep existing image
}

@Component({
  selector: 'app-edit-clothe',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-clothe.component.html',
  styleUrl: './edit-clothe.component.scss',
})
export class EditClotheComponent implements OnInit {

  // ============================================================
  // Inputs & Outputs
  // ============================================================

  @Input() clothe: ClotheDTO = new ClotheDTO();
  @Input() currentUser : UserViewModel | undefined;

  @Output() closed  = new EventEmitter<void>();
  @Output() updated = new EventEmitter<ClotheDTO>();

  constructor(
    private categoryService : CategoryService,
    private clotheService : ClotheService,
    private toastrService : ToastrService,
    private userService : UserService
  ) {}


  // ============================================================
  // State
  // ============================================================

  isSubmitting = false;
  touched      = false;
  isLoading = false;

  // Shows the existing image URL or the new local preview
  imagePreview: string | null = null;

  // True when the user has selected a new file to replace the existing image
  imageChanged = false;


  // ============================================================
  // Dropdown Options
  // ============================================================

  categories : Category[] = [];

  genders: string[] = ['Male', 'Female', 'Unisex'];

  sizes: string[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

  conditions: string[] = ['New', 'Good', 'Fair', 'Poor'];

  materials: string[] = [
    'Silk', 'Satin', 'Velvet', 'Lace', 'Chiffon',
    'Polyester', 'Cotton', 'Wool', 'Linen', 'Others',
  ];

  form: UpdateClotheCommand = new UpdateClotheCommand();

  ngOnInit(): void {
    // Deep-copy clothe into form
    this.form = { ...this.clothe, image: null } as UpdateClotheCommand;
    this.form.performedBy   = '';
    this.form.performedById = 0;

    // Seed the preview with the existing image if present
    if (this.clothe.profileImagePath) {
      this.imagePreview = this.clothe.profileImagePath;
    }

    this.getAllCategories();
    this.getCurrentUser();
  }

  getAllCategories() {
    this.categoryService.getAllCategories()
    .then(res => {
      this.categories = res.data ?? [];
    }).catch(err => {
      this.toastrService.error(err.error);
    })
  }

  getCurrentUser() {
    this.isLoading = true;
    this.userService.getCurrentUserViewModel()
    .then(res => {
      if(!res.isSuccess)
        this.toastrService.error(res.errorMessage);
      this.currentUser = res.data ?? undefined;
    }).catch(err => {
      this.toastrService.error(err.error);
    }).finally(() => {
      this.isLoading = false;
    })
  }

  get errors(): Record<string, string> {
    const f = this.form;
    const e: Record<string, string> = {};

    if (!f.clotheName?.trim())  e['clotheName']   = 'Item name is required.';
    if (!f.categoryName)        e['categoryName'] = 'Select a category.';
    if (!f.clotheGender)        e['clotheGender'] = 'Select a gender.';
    if (!f.size)                e['size']         = 'Select a size.';
    if (!f.color?.trim())       e['color']        = 'Color is required.';
    if (!f.brand?.trim())       e['brand']        = 'Brand is required.';
    if (!f.material)            e['material']     = 'Select a material.';
    if (!f.condition)           e['condition']    = 'Select a condition.';

    if (!f.stockQuantity || f.stockQuantity < 1)
      e['stockQuantity'] = 'Enter a valid stock quantity.';
    if (f.availableQuantity < 0)
      e['availableQuantity'] = 'Available quantity cannot be negative.';
    if (f.availableQuantity > f.stockQuantity)
      e['availableQuantity'] = 'Cannot exceed stock quantity.';

    if (!f.rentalPrice || f.rentalPrice <= 0)
      e['rentalPrice'] = 'Enter a valid rental price.';
    if (!f.depositAmount || f.depositAmount <= 0)
      e['depositAmount'] = 'Enter a valid deposit amount.';
    if (!f.rentalDurationDays || f.rentalDurationDays < 1)
      e['rentalDurationDays'] = 'Enter a valid duration.';

    // Image is optional on edit — existing image is kept if no new one selected
    return e;
  }

  get isValid(): boolean {
    return Object.keys(this.errors).length === 0;
  }

  hasError(field: string): boolean {
    return this.touched && !!this.errors[field];
  }

  errorMsg(field: string): string {
    return this.touched ? (this.errors[field] ?? '') : '';
  }


  // ============================================================
  // Image Upload
  // ============================================================

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file.type.startsWith('image/')) return;

    this.form.image  = file;
    this.imageChanged = true;

    const reader = new FileReader();
    reader.onload = () => this.imagePreview = reader.result as string;
    reader.readAsDataURL(file);
  }

  triggerFileInput(): void {
    document.getElementById('edit-clothe-image-input')?.click();
  }

  removeImage(): void {
    this.form.image   = null;
    this.imagePreview  = null;
    this.imageChanged  = true; // signal that the image should be cleared
    const input = document.getElementById('edit-clothe-image-input') as HTMLInputElement;
    if (input) input.value = '';
  }


  // ============================================================
  // Actions
  // ============================================================

  close(): void {
    this.closed.emit();
  }

  save(): void {
    this.touched = true;
    if (!this.isValid) return;

    this.isSubmitting = true;

    // Build FormData — same pattern as CreateClotheComponent
    const formData = new FormData();
    formData.append('id',                  this.form.id.toString());
    formData.append('clotheName',          this.form.clotheName);
    formData.append('categoryName',        this.form.categoryName);
    formData.append('color',               this.form.color);
    formData.append('brand',               this.form.brand);
    formData.append('material',            this.form.material);
    formData.append('size',                this.form.size);
    formData.append('clotheGender',        this.form.clotheGender);
    formData.append('stockQuantity',       this.form.stockQuantity.toString());
    formData.append('availableQuantity',   this.form.availableQuantity.toString());
    formData.append('rentalPrice',         this.form.rentalPrice.toString());
    formData.append('depositAmount',       this.form.depositAmount.toString());
    formData.append('rentalDurationDays',  this.form.rentalDurationDays.toString());
    formData.append('condition',           this.form.condition);
    formData.append('performedBy',         this.currentUser?.fullName ?? '');
    formData.append('performedById',       this.currentUser?.id.toString() ?? '');

    // Only append image if the user picked a new one
    if (this.form.image) {
      formData.append('image', this.form.image);
    }

    this.clotheService.updateClotheAsync(formData)
    .then(res => {
      if(!res.isSuccess){
        this.toastrService.error(res.errorMessage ?? 'Failed to update the record.');
      }else {
        this.toastrService.success(res.successMessage ?? 'Clothe updated successfully.');
      }
    }).catch(err => {
      this.toastrService.error(err.error ?? 'Something Wrong');
    }).finally(() => {
      this.updated.emit(this.form as ClotheDTO);
      this.isSubmitting = false;
      this.close();
    });
  }
}