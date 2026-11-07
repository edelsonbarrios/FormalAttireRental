import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserViewModel } from '../../../../data/models/DTOs/Users/user-view-model';
import { ClotheService } from '../clothe-service/clothe.service';
import { Toast, ToastrService } from 'ngx-toastr';
import { UserService } from '../../../../core/services/user-service/user.service';
import { ClotheDTO } from '../../../../data/models/DTOs/Clothes/clothes';
import { CategoryService } from '../../categories/category-service/category.service';
import { Category } from '../../../../data/models/DTOs/Category/category';

// TODO: replace with your actual imports
// import { CreateClotheCommand } from '../../../../data/models/DTOs/Clothes/create-clothe-command';
// import { ClotheService } from '../clothe-service/clothe.service';
// import { UserService } from '../../../../core/services/user-service/user.service';
// import { UserViewModel } from '../../../../data/models/DTOs/Users/user-view-model';
// import { AppToastrService } from '../../../../core/services/toastr-service/app-toastr.service';

// ── Inline models — remove once you have real imports ────────

export class CreateClotheCommand extends ClotheDTO {
  performedBy: string = '';
  performedById: number = 0;
  image: File | null = null; // Angular equivalent of IFormFile
}
// ─────────────────────────────────────────────────────────────

@Component({
  selector: 'app-create-clothe',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-clothe.component.html',
  styleUrl: './create-clothe.component.scss',
})
export class CreateClotheComponent implements OnInit {

  // ============================================================
  // Outputs
  // ============================================================

  // Tells the parent to close this modal
  @Output() closed = new EventEmitter<void>();

  // Tells the parent the item was created — parent calls getAllClothes()
  @Output() submitted = new EventEmitter<void>();


  // ============================================================
  // State
  // ============================================================

  isSubmitting = false;
  touched      = false;

  // Base64 string for the image preview in the upload area
  imagePreview: string | null = null;


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


  // ============================================================
  // Form — uses CreateClotheCommand directly, matching the backend
  // ============================================================

  form: CreateClotheCommand = new CreateClotheCommand();


  // ============================================================
  // Lifecycle — get current user for performedBy / performedById
  // ============================================================

  currentUser: UserViewModel | undefined;


  constructor(
    private clotheService : ClotheService,
    private toastrService : ToastrService,
    private userService : UserService,
    private categoryService : CategoryService
  ) {}

  ngOnInit(): void {
    this.getCurrentUser();
    this.getAllCategories();
  }

  getCurrentUser(): void {
    this.userService.getCurrentUserViewModel()
    .then(res => {
      if(!res.isSuccess)
        this.toastrService.error(res.errorMessage);
      this.currentUser = res.data;
    }).catch(err => {
      this.toastrService.error(err.error);
    })
  }

  getAllCategories() {
    this.categoryService.getAllCategories()
    .then(res => {
      if(!res.isSuccess)
        this.toastrService.error(res.errorMessage);
      this.categories = res.data ?? [];
    }).catch(err => {
      this.toastrService.error(err.error);
    }).finally(() => {

    })
  }


  // ============================================================
  // Validation
  // ============================================================

  get errors(): Record<string, string> {
    const f = this.form;
    const e: Record<string, string> = {};

    // Item Info
    if (!f.clotheName?.trim())  e['clotheName']   = 'Item name is required.';
    if (!f.categoryName)        e['categoryName'] = 'Select a category.';
    if (!f.clotheGender)        e['clotheGender'] = 'Select a gender.';
    if (!f.size)                e['size']         = 'Select a size.';
    if (!f.color?.trim())       e['color']        = 'Color is required.';
    if (!f.brand?.trim())       e['brand']        = 'Brand is required.';
    if (!f.material)            e['material']     = 'Select a material.';
    if (!f.condition)           e['condition']    = 'Select a condition.';

    // Stock
    if (!f.stockQuantity || f.stockQuantity < 1)
      e['stockQuantity'] = 'Enter a valid stock quantity.';
    if (f.availableQuantity < 0)
      e['availableQuantity'] = 'Available quantity cannot be negative.';
    if (f.availableQuantity > f.stockQuantity)
      e['availableQuantity'] = 'Cannot exceed stock quantity.';

    // Pricing
    if (!f.rentalPrice || f.rentalPrice <= 0)
      e['rentalPrice'] = 'Enter a valid rental price.';
    if (!f.depositAmount || f.depositAmount <= 0)
      e['depositAmount'] = 'Enter a valid deposit amount.';
    if (!f.rentalDurationDays || f.rentalDurationDays < 1)
      e['rentalDurationDays'] = 'Enter a valid duration.';

    // Image — required per backend validation
    if (!f.image)
      e['profileImage'] = 'A profile image is required.';

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

    // Store the File directly on the command — sent to API via FormData
    this.form.image = file;

    // Generate a preview for the UI
    const reader = new FileReader();
    reader.onload = () => this.imagePreview = reader.result as string;
    reader.readAsDataURL(file);
  }

  triggerFileInput(): void {
    document.getElementById('clothe-image-input')?.click();
  }

  removeImage(): void {
    this.form.image  = null;
    this.imagePreview = null;
    const input = document.getElementById('clothe-image-input') as HTMLInputElement;
    if (input) input.value = '';
  }


  // ============================================================
  // Actions
  // ============================================================

  close(): void {
    this.closed.emit();
  }

  submit(): void {
    this.touched = true;
    if (!this.isValid) return;

    this.isSubmitting = true;

    // Build FormData — maps exactly to CreateClotheCommand on the backend
    const formData = new FormData();
    formData.append('clotheName',         this.form.clotheName);
    formData.append('categoryName',       this.form.categoryName);
    formData.append('color',              this.form.color);
    formData.append('brand',              this.form.brand);
    formData.append('material',           this.form.material);
    formData.append('size',               this.form.size);
    formData.append('clotheGender',       this.form.clotheGender);
    formData.append('stockQuantity',      this.form.stockQuantity.toString());
    formData.append('availableQuantity',  this.form.availableQuantity.toString());
    formData.append('rentalPrice',        this.form.rentalPrice.toString());
    formData.append('depositAmount',      this.form.depositAmount.toString());
    formData.append('rentalDurationDays', this.form.rentalDurationDays.toString());
    formData.append('condition',          this.form.condition);
    formData.append('performedBy',        this.currentUser?.fullName ?? '');
    formData.append('performedById',      this.currentUser?.id.toString() ?? '');

    // 'image' must match the property name in CreateClotheCommand exactly
    if (this.form.image) {
      formData.append('image', this.form.image);
    }

    this.clotheService.createClotheAsync(formData)
    .then(res => {
      if(!res.isSuccess) {
        this.toastrService.error(res.errorMessage ?? "Failed to create record.");
        return;
      }
      this.submitted.emit();
      this.close();
    }).catch(err => {
      this.toastrService.error(err.error);
    }).finally(() => {
      this.isSubmitting = false;
    });
  }
}