import mongoose from 'mongoose';

const shipmentSchema = new mongoose.Schema({
  guia: {
    type: String,
    required: true,
    unique: true
  },

  origen: {
    type: String,
    required: true
  },

  destino: {
    type: String,
    required: true
  },

  weight: {
    type: Number,
    required: true,
    min: 0.01
  },

  destinationCp: {
    type: String,
    required: true
  },

  cost: {
    type: Number,
    required: true,
    min: 0
  },

  hubAsignado: {
    type: String,
    required: true
  },

  creadoPor: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: [
      'PENDIENTE',
      'CREADO',
      'EN_RUTA',
      'ENTREGADO',
      'CANCELADO'
    ],
    default: 'PENDIENTE'
  }

}, {
  timestamps: true
});

export default mongoose.model('Shipment', shipmentSchema);