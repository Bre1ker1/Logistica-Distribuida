import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['CLIENTE', 'OPERADOR', 'ADMIN'], // <-- Asegúrate de tener 'CLIENTE'
    default: 'CLIENTE',
  },
  activo: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

userSchema.methods.comparePassword = async function (candidatePassword) {
  const bcrypt = await import('bcryptjs');
  return bcrypt.default.compare(candidatePassword, this.passwordHash);
};

export default mongoose.model('User', userSchema);