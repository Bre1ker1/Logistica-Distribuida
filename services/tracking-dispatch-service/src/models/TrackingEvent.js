
import mongoose from 'mongoose';

const trackingEventSchema = new mongoose.Schema({
  guia: {
    type: String,
    required: true,
    trim: true
  },

  status: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    enum: [
      'PENDIENTE',
      'CREADO',
      'EN_RUTA',
      'ENTREGADO',
      'CANCELADO'
    ]
  },

  location: {
    type: String,
    required: true,
    trim: true
  },

  registradoPor: {
    type: String,
    required: true,
    trim: true
  },

  timestamp: {
    type: Date,
    default: Date.now,
    immutable: true
  }
});

// Índice para consultar el historial por guía y fecha.
trackingEventSchema.index({
  guia: 1,
  timestamp: -1
});

// Impedir guardar modificaciones de eventos existentes.
// La creación de eventos nuevos sigue permitida.
trackingEventSchema.pre('save', function () {
  if (!this.isNew) {
    throw new Error(
      'Los eventos de tracking son inmutables y no pueden modificarse'
    );
  }
});

// Bloquear las operaciones habituales de actualización
// y eliminación mediante consultas de Mongoose.
const operacionesBloqueadas = [
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'findOneAndReplace',
  'replaceOne',
  'findOneAndDelete',
  'deleteOne',
  'deleteMany'
];

function bloquearModificacion() {
  throw new Error(
    'Los eventos de tracking son inmutables y no pueden modificarse ni eliminarse'
  );
}

// Registrar cada operación por separado.
for (const operacion of operacionesBloqueadas) {
  trackingEventSchema.pre(operacion, bloquearModificacion);
}

// Bloquear eliminación mediante documentos individuales.
trackingEventSchema.pre(
  'deleteOne',
  {
    document: true,
    query: false
  },
  bloquearModificacion
);

// Bloquear operaciones masivas mediante bulkWrite.
trackingEventSchema.pre(
  'bulkWrite',
  bloquearModificacion
);

export default mongoose.model(
  'TrackingEvent',
  trackingEventSchema
);
