import mongoose, { mongo } from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                'Please provide a valid email',
            ],
        },
        passwordHash: {
            type: String,
            required: [true, 'Password is required'],
            minlength: 8,
        },
        avatarUrl: {
            type: String,
            default: '',
        },
        avatarPublicId: {
            type: String,
            default: '',
        },
        role: {
            type: String,
            enum: ['student', 'admin'],
            default: 'student',
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        verifyToken: {
            type: String,
            default: '',
        },
        resetToken: {
            type: String,
            default: '',
        },
        resetTokenExpiry: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

userSchema.pre('save', async function (next) {
    if (!this.isModified('passwordHash')) return next;
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next;
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.passwordHash);
};

userSchema.methods.toSafeObject = function () {
    const obj = this.toObject();
    delete obj.passwordHash;
    delete obj.verifyToken;
    delete obj.resetToken;
    delete obj.resetTokenExpiry;
    return obj;
};

const User = mongoose.model('User', userSchema);

export default User;