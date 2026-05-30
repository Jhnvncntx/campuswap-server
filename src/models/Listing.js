import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  order: { type: Number, default: 0 },
});

const listingSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'Books',
        'Lab Equipment',
        'Electronics',
        'Uniform',
        'Furniture',
        'Others',
      ],
    },
    condition: {
      type: String,
      required: [true, 'Condition is required'],
      enum: ['Brand New', 'Like New', 'Good', 'Fair'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    images: [imageSchema],
    status: {
      type: String,
      enum: ['active', 'sold', 'expired'],
      default: 'active',
    },
    tags: [{ type: String, trim: true }],
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
  }
);

listingSchema.index({ title: 'text', description: 'text', tags: 'text' });
listingSchema.index({ category: 1, condition: 1, status: 1 });
listingSchema.index({ seller: 1 });

const Listing = mongoose.model('Listing', listingSchema);

export default Listing;