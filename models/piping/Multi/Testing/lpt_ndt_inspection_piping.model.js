const mongoose = require("mongoose");
const { Schema } = mongoose;
const { LPTStatus } = require("../../../../utils/enumpiping");
const lptNdtInspectionPiping = new Schema(
  {
    report_no: {
      type: String,
      required: true
    },
     report_no_two: {
      type: String,
    },
    offer_date: {
      type: Date,
      required: true,
    },
    project_id: {
      type: Schema.Types.ObjectId,
      ref: "bussiness-projects",
      required: true,
    },
     procedure_no: {
      type: Schema.Types.ObjectId,
      ref: "piping_procedure_and_specifications",
    },

    test_date:{
              type:Date
            },
              acceptance_code: {
      type: String,
    },

    items: {
      type: [
        {
              ndt_master_id: {
      type: Schema.Types.ObjectId,
      ref: "piping_ndts",
      required: true,
    },
     lpt_lot_book_id:{
             type: Schema.Types.ObjectId,
            ref: "piping-lpt-lots",
            required: true,
          },
          lpt_lot_book_item_id:{
             type: Schema.Types.ObjectId,
            ref: "piping-lpt-lots",
            required: true,
          },
          weld_visual_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-weld-visual-inspections",
            required: true,
          },
          weld_visual_item_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-weld-visual-inspections",
            required: true,
          },
            welder_id: {
            type: Schema.Types.ObjectId,
            ref: "piping_welders",
          },
          drawing_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-drawing",
            required: true,
          },
          spool_no_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-drawing-spool-no-joint-items",
            required: true,
          },
           joint_spool_item_id: {
                      type: Schema.Types.ObjectId,
                      ref: "piping-drawing-joint-items",
                      required: true,
                    },
                    joint_type_id: {
                      type: Schema.Types.ObjectId,
                      ref: "piping-joint-types",
                      required: true,
                    },
          piping_class: {
            type: Schema.Types.ObjectId,
            ref: "piping-class-request",
            required: true,
          },
          piping_material_specification: {
            type: Schema.Types.ObjectId,
            ref: "piping-material-specification",
            required: true,
          },
             material_item_id_1: {
                type: Schema.Types.ObjectId,
                ref: "piping-drawing-material-items",
                required: true,
            },
            material_item_id_2: {
                type: Schema.Types.ObjectId,
                ref: "piping-drawing-material-items",
                required: true,
            },
          observation: {
            type: String,
          },
              is_accepted: {
                type:Boolean,
                // default:false
          },
             qc_remarks: {
            type: String,
          },
           remarks: {
            type: String,
          },
        },
      ],
    },
    test_details: {
      surface_condition: {
        type: String,
      },
      surface_temperature: {
        type: String,
      },
      examination_stage: {
        type: String,
      },
      technique: {
        type: String,
      },
      lighting_equipment: {
        type: String,
      },
      lighting_intensity: {
        type: String,
      },
      extent_examination: {
        type: String,
      },
      penetrant: {
        type: {
          type: String,
          default: "Solvent Removable",
        },
        make: String,
        batch_no: String,
        validity: String,
      },

      cleaner: {
        type: {
          type: String,
          default: "Solvent Removable",
        },
        make: String,
        batch_no: String,
        validity: String,
      },

      developer: {
        type: {
          type: String,
          default: "Solvent Removable",
        },
        make: String,
        batch_no: String,
        validity: String,
      },
    },
    offered_by: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
    report_date: {
      type: Date,
    },
    qc_name: {
  type: Schema.Types.ObjectId,
  ref: "user",
},
qc_time: {
  type: Date,
},

    status: {
      type: Number, //1-Pending 2-Approved 3-Rejected 4-Send to QC for approval 5-Completed
       default: LPTStatus.Pending,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("piping-lpt-ndt-inspection", lptNdtInspectionPiping);
