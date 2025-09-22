const html_to_pdf = require("html-pdf-node");

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Helper function to generate PDF
async function generatePrescriptionPDF2(formData, selectedClinic) {
  try {
    // Generate HTML content with enhanced styling (same as provided)
    const htmlContent = `
      <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            .prescription-container {
              width: 210mm;
              min-height: 297mm;
              padding: 10mm;
              margin: 0 auto;
              background: #fff;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              font-size: 14px;
              color: #1f2937;
              line-height: 1.5;
              position: relative;
            }

            .prescription-header {
              border-bottom: 3px solid #3b82f6;
              padding-bottom: 20px;
              margin-bottom: 15px;
              position: relative;
              width: 100%;
              padding: 0;
              margin: 0;
            }

            .prescription-header img {
              width: 95%;
              height: 40mm;
              margin: 3%;
              object-fit: cover;
              display: block;
            }

            .clinic-info {
              text-align: center;
              margin-bottom: 15px;
            }

            .clinic-name {
              font-size: 28px;
              font-weight: 700;
              color: #1e40af;
              margin-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }

            .contact-info {
              font-size: 13px;
              color: #6b7280;
              display: flex;
              justify-content: center;
              gap: 20px;
              flex-wrap: wrap;
            }

            .contact-info div {
              display: flex;
              align-items: center;
              gap: 5px;
            }

            .info-section {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
              background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
              border-radius: 12px;
              padding: 20px;
              border: 1px solid #e2e8f0;
            }

            .doctor-info, .patient-info {
              flex: 1;
            }

            .patient-info {
              text-align: right;
              padding-left: 20px;
              margin-left: 20px;
            }

            .info-title {
              font-size: 12px;
              font-weight: 600;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 8px;
            }

            .doctor-name {
              font-size: 20px;
              font-weight: 700;
              color: #1e40af;
              margin-bottom: 6px;
            }

            .doctor-credentials {
              font-size: 14px;
              color: #4b5563;
              margin-bottom: 4px;
            }

            .registration-no {
              font-size: 12px;
              color: #6b7280;
              font-weight: 500;
            }

            .patient-name {
              font-size: 18px;
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 6px;
            }

            .patient-details {
              font-size: 13px;
              color: #6b7280;
              margin-bottom: 4px;
            }

            .appointment-info {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 15px;
              background: #3b82f6;
              color: white;
              padding: 15px 20px;
              border-radius: 8px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }

            .appointment-item {
              display: flex;
              align-items: center;
              gap: 8px;
              font-weight: 500;
            }

            .prescription-section {
              margin-bottom: 15px;
              background: white;
              border-radius: 10px;
              border: 1px solid #e5e7eb;
              overflow: hidden;
            }

            .section-header {
              background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
              font-size: 16px;
              font-weight: 700;
              padding: 15px 20px;
              color: #1f2937;
              border-bottom: 2px solid #d1d5db;
              display: flex;
              align-items: center;
              gap: 10px;
            }

            .section-content {
              padding: 20px;
            }

            .detail-item {
              margin-bottom: 12px;
              padding: 10px 0;
              border-bottom: 1px solid #f3f4f6;
            }

            .detail-item:last-child {
              border-bottom: none;
            }

            .detail-label {
              font-weight: 600;
              color: #374151;
              margin-bottom: 4px;
              font-size: 13px;
            }

            .detail-value {
              color: #4b5563;
              line-height: 1.6;
            }

            .vitals-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
              gap: 15px;
            }

            .vital-card {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px;
              text-align: center;
            }

            .vital-label {
              font-size: 12px;
              font-weight: 600;
              color: #6b7280;
              text-transform: uppercase;
              margin-bottom: 4px;
            }

            .vital-value {
              font-size: 16px;
              font-weight: 700;
              color: #1f2937;
            }

            .investigation-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
              gap: 10px;
            }

            .investigation-item {
              background: #fef3c7;
              border: 1px solid #f59e0b;
              border-radius: 6px;
              padding: 8px 12px;
              font-weight: 500;
              color: #92400e;
            }

            .diagnosis-tags {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
            }

            .diagnosis-tag {
              background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
              color: white;
              padding: 8px 16px;
              border-radius: 20px;
              font-weight: 600;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }

            .medication-table {
              width: 100%;
              border-collapse: collapse;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }

            .table-header {
              background: #1f2937;
              color: white;
              padding: 12px 10px;
              text-align: left;
              font-weight: 600;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            .table-cell {
              padding: 12px 10px;
              border-bottom: 1px solid #e5e7eb;
              vertical-align: top;
              font-size: 13px;
            }

            .table-cell:first-child {
              font-weight: 600;
              color: #1f2937;
            }

            tbody tr:nth-child(even) {
              background: #f9fafb;
            }

            tbody tr:hover {
              background: #f3f4f6;
            }

            .advice-list {
              list-style: none;
              padding: 0;
            }

            .advice-item {
              display: flex;
              align-items: flex-start;
              margin-bottom: 10px;
              padding: 8px 0;
            }

            .bullet {
              color: #3b82f6;
              font-weight: bold;
              margin-right: 10px;
              font-size: 16px;
            }

            .follow-up-container {
              background: #ecfdf5;
              border: 2px solid #10b981;
              border-radius: 8px;
              padding: 15px;
              text-align: center;
            }

            .follow-up-date {
              font-size: 16px;
              font-weight: 700;
              color: #047857;
            }

            .notes-display {
              margin-top: 15px;
              background: #fffbeb;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              border-radius: 0 6px 6px 0;
            }

            .notes-label {
              font-weight: 600;
              color: #92400e;
              margin-bottom: 6px;
              font-size: 13px;
            }

            .notes-content {
              color: #78350f;
              line-height: 1.6;
            }

            .signature {
              margin-top: 20px;
              text-align: right;
              border-top: 2px solid #e5e7eb;
              padding-top: 20px;
            }

            .digital-signature {
              max-width: 150px;
              height: auto;
              margin-bottom: 10px;
            }

            .signature-text {
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 5px;
            }

            .signature-verified {
              font-size: 12px;
              color: #059669;
              font-weight: 500;
            }

            .prescription-footer {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 11px;
              text-align: center;
              color: #6b7280;
              font-style: italic;
            }

            .watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 60px;
              color: rgba(59, 130, 246, 0.05);
              font-weight: 900;
              z-index: -1;
              pointer-events: none;
            }

            @media print {
              .prescription-container {
                box-shadow: none;
                border: none;
              }
              
              .prescription-section {
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="prescription-container">
            <!-- Watermark -->
            <div class="watermark">E-PRESCRIPTION</div>

            <!-- Header -->
            <div class="prescription-header">
              ${
                selectedClinic?.headerImage
                  ? `<img src="${selectedClinic.headerImage}" alt="Clinic Header" />`
                  : selectedClinic
                  ? `
                    ${
                      selectedClinic.clinicName &&
                      selectedClinic.clinicName !== "Clinic Name"
                        ? `<div class="clinic-info">
                             <div class="clinic-name">${
                               selectedClinic.clinicName
                                 .charAt(0)
                                 .toUpperCase() +
                               selectedClinic.clinicName.slice(1)
                             }</div>
                           </div>`
                        : ""
                    }
                    ${
                      selectedClinic.address || selectedClinic.mobile
                        ? `<div class="contact-info">
                             ${
                               selectedClinic.address &&
                               selectedClinic.address !== "Address not provided"
                                 ? `<div>📍 ${selectedClinic.address}</div>`
                                 : ""
                             }
                             ${
                               selectedClinic.mobile &&
                               selectedClinic.mobile !== "Contact not provided"
                                 ? `<div>📞 ${selectedClinic.mobile}</div>`
                                 : ""
                             }
                           </div>`
                        : ""
                    }
                  `
                  : ""
              }
            </div>

            <!-- Doctor and Patient Info -->
            <div class="info-section">
              <div class="doctor-info">
                <div class="info-title">Consulting Physician</div>
                ${
                  formData.doctorInfo?.doctorName &&
                  formData.doctorInfo.doctorName !== "Unknown Doctor"
                    ? `<div class="doctor-name">DR. ${formData.doctorInfo.doctorName}</div>`
                    : ""
                }
                ${
                  formData.doctorInfo?.qualifications ||
                  formData.doctorInfo?.specialization
                    ? `<div class="doctor-credentials">
                         ${
                           formData.doctorInfo?.qualifications &&
                           formData.doctorInfo.qualifications !==
                             "Qualifications not provided"
                             ? formData.doctorInfo.qualifications
                             : ""
                         }
                         ${
                           formData.doctorInfo?.qualifications &&
                           formData.doctorInfo.specialization
                             ? " | "
                             : ""
                         }
                         ${
                           formData.doctorInfo?.specialization &&
                           formData.doctorInfo.specialization !== "Specialist"
                             ? formData.doctorInfo.specialization
                             : ""
                         }
                       </div>`
                    : ""
                }
                ${
                  formData.doctorInfo?.medicalRegistrationNumber &&
                  formData.doctorInfo.medicalRegistrationNumber !==
                    "Not provided"
                    ? `<div class="registration-no">
                         Reg. No: ${formData.doctorInfo.medicalRegistrationNumber}
                       </div>`
                    : ""
                }
              </div>
              
              <div class="patient-info">
                <div class="info-title">Patient Details</div>
                ${
                  formData.patientInfo?.patientName &&
                  formData.patientInfo.patientName !== "Unknown Patient"
                    ? `<div class="patient-name">${formData.patientInfo.patientName}</div>`
                    : ""
                }
                ${
                  formData.patientInfo?.age || formData.patientInfo?.gender
                    ? `<div class="patient-details">
                         ${
                           formData.patientInfo?.age &&
                           formData.patientInfo.age !== "Age not provided"
                             ? `${formData.patientInfo.age} Years`
                             : ""
                         }
                         ${
                           formData.patientInfo?.age &&
                           formData.patientInfo?.gender
                             ? " • "
                             : ""
                         }
                         ${
                           formData.patientInfo?.gender &&
                           formData.patientInfo.gender !== "Gender not provided"
                             ? formData.patientInfo.gender
                                 .charAt(0)
                                 .toUpperCase() +
                               formData.patientInfo.gender.slice(1)
                             : ""
                         }
                       </div>`
                    : ""
                }
                ${
                  formData.patientInfo?.mobileNumber &&
                  formData.patientInfo.mobileNumber !== "Contact not provided"
                    ? `<div class="patient-details">📱 ${formData.patientInfo.mobileNumber}</div>`
                    : ""
                }
              </div>
            </div>

            <!-- Appointment Date and Time -->
            ${
              formData.doctorInfo?.appointmentDate ||
              formData.doctorInfo?.appointmentStartTime
                ? `<div class="appointment-info">
                     ${
                       formData.doctorInfo?.appointmentDate &&
                       formatDate(formData.doctorInfo.appointmentDate)
                         ? `<div class="appointment-item">
                              📅 ${formatDate(
                                formData.doctorInfo.appointmentDate
                              )}
                            </div>`
                         : ""
                     }
                     ${
                       formData.doctorInfo?.appointmentStartTime &&
                       formData.doctorInfo.appointmentStartTime !==
                         "Not specified"
                         ? `<div class="appointment-item">
                              🕒 ${formData.doctorInfo.appointmentStartTime}
                            </div>`
                         : ""
                     }
                   </div>`
                : ""
            }

            <!-- Prescription Content -->
            ${
              formData.patientInfo?.chiefComplaint ||
              formData.patientInfo?.pastMedicalHistory ||
              formData.patientInfo?.familyMedicalHistory ||
              formData.patientInfo?.physicalExamination
                ? `<div class="prescription-section">
                     <div class="section-header">
                       📋 PATIENT HISTORY
                     </div>
                     <div class="section-content">
                       ${
                         formData.patientInfo?.chiefComplaint &&
                         formData.patientInfo.chiefComplaint !== "Not specified"
                           ? `<div class="detail-item">
                                <div class="detail-label">Chief Complaint</div>
                                <div class="detail-value">${formData.patientInfo.chiefComplaint}</div>
                              </div>`
                           : ""
                       }
                       ${
                         formData.patientInfo?.pastMedicalHistory &&
                         formData.patientInfo.pastMedicalHistory !==
                           "Not provided"
                           ? `<div class="detail-item">
                                <div class="detail-label">Past Medical History</div>
                                <div class="detail-value">${formData.patientInfo.pastMedicalHistory}</div>
                              </div>`
                           : ""
                       }
                       ${
                         formData.patientInfo?.familyMedicalHistory &&
                         formData.patientInfo.familyMedicalHistory !==
                           "Not provided"
                           ? `<div class="detail-item">
                                <div class="detail-label">Family History</div>
                                <div class="detail-value">${formData.patientInfo.familyMedicalHistory}</div>
                              </div>`
                           : ""
                       }
                       ${
                         formData.patientInfo?.physicalExamination &&
                         formData.patientInfo.physicalExamination !==
                           "Not provided"
                           ? `<div class="detail-item">
                                <div class="detail-label">Physical Examination</div>
                                <div class="detail-value">${formData.patientInfo.physicalExamination}</div>
                              </div>`
                           : ""
                       }
                     </div>
                   </div>`
                : ""
            }

            ${
              formData.vitals?.bp ||
              formData.vitals?.bpSystolic ||
              formData.vitals?.bpDiastolic ||
              formData.vitals?.pulseRate ||
              formData.vitals?.temperature ||
              formData.vitals?.spo2 ||
              formData.vitals?.respiratoryRate ||
              formData.vitals?.height ||
              formData.vitals?.weight ||
              formData.vitals?.bmi ||
              formData.vitals?.other
                ? `<div class="prescription-section">
                     <div class="section-header">
                       🩺 VITAL SIGNS
                     </div>
                     <div class="section-content">
                       <div class="vitals-grid">
                         ${
                           formData.vitals?.bp ||
                           (formData.vitals?.bpSystolic &&
                             formData.vitals?.bpDiastolic)
                             ? `<div class="vital-card">
                                  <div class="vital-label">Blood Pressure</div>
                                  <div class="vital-value">
                                    ${
                                      formData.vitals?.bp
                                        ? formData.vitals.bp
                                        : formData.vitals?.bpSystolic &&
                                          formData.vitals?.bpDiastolic
                                        ? `${formData.vitals.bpSystolic}/${formData.vitals.bpDiastolic}`
                                        : null
                                    } mmHg
                                  </div>
                                </div>`
                             : ""
                         }
                         ${
                           formData.vitals?.pulseRate &&
                           formData.vitals.pulseRate !== "Not provided"
                             ? `<div class="vital-card">
                                  <div class="vital-label">Pulse Rate</div>
                                  <div class="vital-value">${formData.vitals.pulseRate} BPM</div>
                                </div>`
                             : ""
                         }
                         ${
                           formData.vitals?.temperature &&
                           formData.vitals.temperature !== "Not provided"
                             ? `<div class="vital-card">
                                  <div class="vital-label">Temperature</div>
                                  <div class="vital-value">${formData.vitals.temperature}°F</div>
                                </div>`
                             : ""
                         }
                         ${
                           formData.vitals?.spo2 &&
                           formData.vitals.spo2 !== "Not provided"
                             ? `<div class="vital-card">
                                  <div class="vital-label">SpO₂</div>
                                  <div class="vital-value">${formData.vitals.spo2}%</div>
                                </div>`
                             : ""
                         }
                         ${
                           formData.vitals?.respiratoryRate &&
                           formData.vitals.respiratoryRate !== "Not provided"
                             ? `<div class="vital-card">
                                  <div class="vital-label">Respiratory Rate</div>
                                  <div class="vital-value">${formData.vitals.respiratoryRate}/min</div>
                                </div>`
                             : ""
                         }
                         ${
                           formData.vitals?.height &&
                           formData.vitals.height !== "Not provided"
                             ? `<div class="vital-card">
                                  <div class="vital-label">Height</div>
                                  <div class="vital-value">${formData.vitals.height} cm</div>
                                </div>`
                             : ""
                         }
                         ${
                           formData.vitals?.weight &&
                           formData.vitals.weight !== "Not provided"
                             ? `<div class="vital-card">
                                  <div class="vital-label">Weight</div>
                                  <div class="vital-value">${formData.vitals.weight} kg</div>
                                </div>`
                             : ""
                         }
                         ${
                           formData.vitals?.bmi &&
                           formData.vitals.bmi !== "Not provided"
                             ? `<div class="vital-card">
                                  <div class="vital-label">BMI</div>
                                  <div class="vital-value">${formData.vitals.bmi}</div>
                                </div>`
                             : ""
                         }
                       </div>
                     </div>
                   </div>`
                : ""
            }

            ${
              formData.diagnosis?.selectedTests?.length > 0
                ? `<div class="prescription-section">
                     <div class="section-header">
                       🔬 INVESTIGATIONS
                     </div>
                     <div class="section-content">
                       <div class="investigation-grid">
                         ${formData.diagnosis.selectedTests
                           .map(
                             (test, index) =>
                               `<div class="investigation-item">
                                  ${test.testName || test}
                                </div>`
                           )
                           .join("")}
                       </div>
                       ${
                         formData.diagnosis?.testNotes
                           ? `<div class="notes-display">
                                <div class="notes-label">Investigation Notes</div>
                                <div class="notes-content">${formData.diagnosis.testNotes}</div>
                              </div>`
                           : ""
                       }
                     </div>
                   </div>`
                : ""
            }

            ${
              formData.diagnosis?.diagnosisList
                ? `<div class="prescription-section">
                     <div class="section-header">
                       🩺 DIAGNOSIS
                     </div>
                     <div class="section-content">
                       <div class="diagnosis-tags">
                         ${formData.diagnosis.diagnosisList
                           .split(",")
                           .map((diagnosis, index) =>
                             diagnosis.trim()
                               ? `<span class="diagnosis-tag">${diagnosis.trim()}</span>`
                               : ""
                           )
                           .join("")}
                       </div>
                     </div>
                   </div>`
                : ""
            }

            ${
              formData.diagnosis?.medications?.length > 0 ||
              formData.advice?.medicationNotes
                ? `<div class="prescription-section">
                     <div class="section-header">
                       💊 PRESCRIPTION
                     </div>
                     <div class="section-content">
                       ${
                         formData.diagnosis?.medications?.length > 0
                           ? `<table class="medication-table">
                                <thead>
                                  <tr>
                                    <th class="table-header">Type</th>
                                    <th class="table-header">Medicine</th>
                                    <th class="table-header">Dosage</th>
                                    <th class="table-header">Frequency</th>
                                    <th class="table-header">Timing</th>
                                    <th class="table-header">Instructions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  ${formData.diagnosis.medications
                                    .map(
                                      (med, index) => `
                                        <tr>
                                          <td class="table-cell">${
                                            med.medicineType || "Oral"
                                          }</td>
                                          <td class="table-cell">${
                                            med.medName ||
                                            med.name ||
                                            "Not specified"
                                          }</td>
                                          <td class="table-cell">${
                                            med.dosage ||
                                            med.dosagePattern ||
                                            "As directed"
                                          }</td>
                                          <td class="table-cell">${
                                            med.frequency || "As needed"
                                          }</td>
                                          <td class="table-cell">${
                                            med.timings
                                              ? med.timings.join(", ")
                                              : med.timing || "With meals"
                                          }</td>
                                          <td class="table-cell">${
                                            med.notes || "Take as prescribed"
                                          }</td>
                                        </tr>`
                                    )
                                    .join("")}
                                </tbody>
                              </table>`
                           : ""
                       }
                       ${
                         formData.advice?.medicationNotes
                           ? `<div class="notes-display">
                                <div class="notes-label">Additional Instructions</div>
                                <div class="notes-content">${formData.advice.medicationNotes}</div>
                              </div>`
                           : ""
                       }
                     </div>
                   </div>`
                : ""
            }

            ${
              formData.advice?.advice
                ? `<div class="prescription-section">
                     <div class="section-header">
                       💡 MEDICAL ADVICE
                     </div>
                     <div class="section-content">
                       <ul class="advice-list">
                         ${formData.advice.advice
                           .split("\n")
                           .map((item, index) =>
                             item.trim()
                               ? `<li class="advice-item">
                                      <span class="bullet">•</span>
                                      <span>${item}</span>
                                    </li>`
                               : ""
                           )
                           .join("")}
                       </ul>
                     </div>
                   </div>`
                : ""
            }

            ${
              formData.advice?.followUpDate &&
              formatDate(formData.advice.followUpDate)
                ? `<div class="prescription-section">
                     <div class="section-header">
                       📅 FOLLOW-UP
                     </div>
                     <div class="section-content">
                       <div class="follow-up-container">
                         <div class="follow-up-date">
                           Next Appointment: ${formatDate(
                             formData.advice.followUpDate
                           )}
                         </div>
                       </div>
                     </div>
                   </div>`
                : ""
            }

            <!-- Digital Signature -->
            <div class="signature">
              ${
                selectedClinic?.digitalSignature
                  ? `<img src="${selectedClinic.digitalSignature}" alt="Digital Signature" class="digital-signature" />`
                  : formData.doctorInfo?.doctorName &&
                    formData.doctorInfo.doctorName !== "Unknown Doctor"
                  ? `<div style="height: 60px; border-bottom: 1px solid #d1d5db; margin-bottom: 10px;"></div>
                     <div class="signature-text">DR. ${formData.doctorInfo.doctorName}</div>`
                  : ""
              }
              <div class="signature-verified">
                ✅ Digitally Verified E-Prescription
              </div>
            </div>

            <!-- Footer -->
            <div class="prescription-footer">
              <div>This is a computer-generated e-prescription and does not require a physical signature.</div>
              <div>Generated on ${new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })} at ${new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}</div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Configure options for html-pdf-node
    const options = {
      format: "A4",
      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "0mm",
        left: "0mm",
      },
      printBackground: true,
      preferCSSPageSize: true,
      args: [
        "--no-sandbox",

        "--disable-setuid-sandbox",

        "--disable-dev-shm-usage",

        "--disable-gpu",
      ],
    };

    // Generate PDF using html-pdf-node
    const pdfBuffer = await html_to_pdf.generatePdf(
      { content: htmlContent },
      options
    );

    // Return the PDF buffer
    return pdfBuffer;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error("Failed to generate PDF: " + error.message);
  }
}

async function generatePrescriptionPDF(formData, selectedClinic) {
  try {
    // Generate HTML content with enhanced styling
    const htmlContent = `
      <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            .prescription-container {
              width: 210mm;
              min-height: 297mm;
              padding: 8mm;
              margin: 0 auto;
              background: #fff;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              font-size: 14px;
              color: #1f2937;
              line-height: 1.5;
              position: relative;
            }

            .prescription-header {
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 15px;
              margin-bottom: 15px;
              position: relative;
              width: 100%;
            }

            .prescription-header img {
              width: 95%;
              height: 40mm;
              margin: 3%;
              object-fit: cover;
              display: block;
            }

            .clinic-info {
              text-align: center;
              margin-bottom: 15px;
            }

            .clinic-name {
              font-size: 26px;
              font-weight: 700;
              color: #1e3a8a;
              margin-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 0.8px;
            }

            .contact-info {
              font-size: 12px;
              color: #6b7280;
              display: flex;
              justify-content: center;
              gap: 15px;
              flex-wrap: wrap;
            }

            .contact-info div {
              display: flex;
              align-items: center;
              gap: 5px;
            }

            .info-section {
              display: flex;
              justify-content: space-between;
              margin-bottom: 15px;
              background: #f9fafb;
              border-radius: 8px;
              padding: 15px;
              border: 1px solid #e5e7eb;
            }

            .doctor-info, .patient-info {
              flex: 1;
            }

            .patient-info {
              text-align: right;
              padding-left: 15px;
            }

            .info-title {
              font-size: 12px;
              font-weight: 600;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 8px;
            }

            .doctor-name {
              font-size: 18px;
              font-weight: 700;
              color: #1e3a8a;
              margin-bottom: 6px;
            }

            .doctor-credentials {
              font-size: 13px;
              color: #4b5563;
              margin-bottom: 4px;
            }

            .registration-no {
              font-size: 12px;
              color: #6b7280;
              font-weight: 500;
            }

            .patient-name {
              font-size: 18px;
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 6px;
            }

            .patient-details {
              font-size: 13px;
              color: #6b7280;
              margin-bottom: 4px;
            }

            .appointment-info {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 15px;
              background: #e5e7eb;
              padding: 12px 15px;
              border-radius: 6px;
            }

            .appointment-item {
              display: flex;
              align-items: center;
              gap: 8px;
              font-weight: 500;
              color: #1f2937;
            }

            .prescription-section {
              margin-bottom: 15px;
              background: white;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
              overflow: hidden;
              break-inside: avoid;
            }

            .section-header {
              background: #f1f5f9;
              font-size: 15px;
              font-weight: 700;
              padding: 12px 15px;
              color: #1f2937;
              border-bottom: 1px solid #d1d5db;
              display: flex;
              align-items: center;
              gap: 8px;
            }

            .section-content {
              padding: 15px;
            }

            .detail-item {
              margin-bottom: 10px;
              padding: 8px 0;
              border-bottom: 1px solid #f1f5f9;
            }

            .detail-item:last-child {
              border-bottom: none;
            }

            .detail-label {
              font-weight: 600;
              color: #374151;
              margin-bottom: 4px;
              font-size: 13px;
            }

            .detail-value {
              color: #4b5563;
              line-height: 1.6;
            }

            .vitals-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
              gap: 12px;
              padding: 10px;
            }

            .vital-card {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              padding: 10px;
              text-align: center;
              word-wrap: break-word;
              overflow: hidden;
            }

            .vital-label {
              font-size: 11px;
              font-weight: 600;
              color: #6b7280;
              text-transform: uppercase;
              margin-bottom: 4px;
            }

            .vital-value {
              font-size: 14px;
              font-weight: 600;
              color: #1f2937;
              word-break: break-all;
            }

            .investigation-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
              gap: 10px;
              padding: 10px;
            }

            .investigation-item {
              background: #f1f5f9;
              border: 1px solid #d1d5db;
              border-radius: 6px;
              padding: 8px 10px;
              font-weight: 500;
              color: #374151;
              word-wrap: break-word;
              overflow: hidden;
              font-size: 12px;
            }

            .diagnosis-tags {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            }

            .diagnosis-tag {
              background: #e5e7eb;
              color: #1f2937;
              padding: 6px 12px;
              border-radius: 16px;
              font-weight: 600;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            .medication-table {
              width: 100%;
              border-collapse: collapse;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            }

            .table-header {
              background: #1f2937;
              color: white;
              padding: 10px;
              text-align: left;
              font-weight: 600;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            .table-cell {
              padding: 10px;
              border-bottom: 1px solid #e5e7eb;
              vertical-align: top;
              font-size: 13px;
            }

            .table-cell:first-child {
              font-weight: 600;
              color: #1f2937;
            }

            tbody tr:nth-child(even) {
              background: #f9fafb;
            }

            tbody tr:hover {
              background: #f1f5f9;
            }

            .advice-list {
              list-style: none;
              padding: 0;
            }

            .advice-item {
              display: flex;
              align-items: flex-start;
              margin-bottom: 8px;
              padding: 6px 0;
            }

            .bullet {
              color: #1e3a8a;
              font-weight: bold;
              margin-right: 8px;
              font-size: 14px;
            }

            .follow-up-container {
              background: #f1f5f9;
              border: 1px solid #d1d5db;
              border-radius: 6px;
              padding: 12px;
              text-align: center;
            }

            .follow-up-date {
              font-size: 15px;
              font-weight: 600;
              color: #1e3a8a;
            }

            .notes-display {
              margin-top: 12px;
              background: #f9fafb;
              border-left: 3px solid #1e3a8a;
              padding: 12px;
              border-radius: 0 6px 6px 0;
            }

            .notes-label {
              font-weight: 600;
              color: #1e3a8a;
              margin-bottom: 4px;
              font-size: 12px;
            }

            .notes-content {
              color: #4b5563;
              line-height: 1.6;
            }

            .signature {
              margin-top: 15px;
              text-align: right;
              border-top: 1px solid #e5e7eb;
              padding-top: 15px;
            }

            .digital-signature {
              max-width: 140px;
              height: auto;
              margin-bottom: 8px;
            }

            .signature-text {
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 4px;
            }

            .signature-verified {
              font-size: 11px;
              color: #1e3a8a;
              font-weight: 500;
            }

            .prescription-footer {
              margin-top: 15px;
              padding-top: 15px;
              border-top: 1px solid #e5e7eb;
              font-size: 10px;
              text-align: center;
              color: #6b7280;
              font-style: italic;
            }

            .watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 50px;
              color: rgba(31, 41, 55, 0.05);
              font-weight: 900;
              z-index: -1;
              pointer-events: none;
            }

            @media print {
              .prescription-container {
                box-shadow: none;
                border: none;
              }
              
              .prescription-section {
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="prescription-container">
            <!-- Watermark -->
            <div class="watermark">E-PRESCRIPTION</div>

            <!-- Header -->
            <div class="prescription-header">
              ${
                selectedClinic?.headerImage
                  ? `<img src="${selectedClinic.headerImage}" alt="Clinic Header" />`
                  : selectedClinic
                  ? `
                    ${
                      selectedClinic.clinicName &&
                      selectedClinic.clinicName !== "Clinic Name"
                        ? `<div class="clinic-info">
                             <div class="clinic-name">${
                               selectedClinic.clinicName
                                 .charAt(0)
                                 .toUpperCase() +
                               selectedClinic.clinicName.slice(1)
                             }</div>
                           </div>`
                        : ""
                    }
                    ${
                      selectedClinic.address || selectedClinic.mobile
                        ? `<div class="contact-info">
                             ${
                               selectedClinic.address &&
                               selectedClinic.address !== "Address not provided"
                                 ? `<div>📍 ${selectedClinic.address}</div>`
                                 : ""
                             }
                             ${
                               selectedClinic.mobile &&
                               selectedClinic.mobile !== "Contact not provided"
                                 ? `<div>📞 ${selectedClinic.mobile}</div>`
                                 : ""
                             }
                           </div>`
                        : ""
                    }
                  `
                  : ""
              }
            </div>

            <!-- Doctor and Patient Info -->
            <div class="info-section">
              <div class="doctor-info">
                <div class="info-title">Consulting Physician</div>
                ${
                  formData.doctorInfo?.doctorName &&
                  formData.doctorInfo.doctorName !== "Unknown Doctor"
                    ? `<div class="doctor-name">DR. ${formData.doctorInfo.doctorName}</div>`
                    : ""
                }
                ${
                  formData.doctorInfo?.qualifications ||
                  formData.doctorInfo?.specialization
                    ? `<div class="doctor-credentials">
                         ${
                           formData.doctorInfo?.qualifications &&
                           formData.doctorInfo.qualifications !==
                             "Qualifications not provided"
                             ? formData.doctorInfo.qualifications
                             : ""
                         }
                         ${
                           formData.doctorInfo?.qualifications &&
                           formData.doctorInfo.specialization
                             ? " | "
                             : ""
                         }
                         ${
                           formData.doctorInfo?.specialization &&
                           formData.doctorInfo.specialization !== "Specialist"
                             ? formData.doctorInfo.specialization
                             : ""
                         }
                       </div>`
                    : ""
                }
                ${
                  formData.doctorInfo?.medicalRegistrationNumber &&
                  formData.doctorInfo.medicalRegistrationNumber !==
                    "Not provided"
                    ? `<div class="registration-no">
                         Reg. No: ${formData.doctorInfo.medicalRegistrationNumber}
                       </div>`
                    : ""
                }
              </div>
              
              <div class="patient-info">
                <div class="info-title">Patient Details</div>
                ${
                  formData.patientInfo?.patientName &&
                  formData.patientInfo.patientName !== "Unknown Patient"
                    ? `<div class="patient-name">${formData.patientInfo.patientName}</div>`
                    : ""
                }
                ${
                  formData.patientInfo?.age || formData.patientInfo?.gender
                    ? `<div class="patient-details">
                         ${
                           formData.patientInfo?.age &&
                           formData.patientInfo.age !== "Age not provided"
                             ? `${formData.patientInfo.age} Years`
                             : ""
                         }
                         ${
                           formData.patientInfo?.age &&
                           formData.patientInfo?.gender
                             ? " • "
                             : ""
                         }
                         ${
                           formData.patientInfo?.gender &&
                           formData.patientInfo.gender !== "Gender not provided"
                             ? formData.patientInfo.gender
                                 .charAt(0)
                                 .toUpperCase() +
                               formData.patientInfo.gender.slice(1)
                             : ""
                         }
                       </div>`
                    : ""
                }
                ${
                  formData.patientInfo?.mobileNumber &&
                  formData.patientInfo.mobileNumber !== "Contact not provided"
                    ? `<div class="patient-details">📱 ${formData.patientInfo.mobileNumber}</div>`
                    : ""
                }
              </div>
            </div>

            <!-- Appointment Date and Time -->
            ${
              formData.doctorInfo?.appointmentDate ||
              formData.doctorInfo?.appointmentStartTime
                ? `<div class="appointment-info">
                     ${
                       formData.doctorInfo?.appointmentDate &&
                       formatDate(formData.doctorInfo.appointmentDate)
                         ? `<div class="appointment-item">
                              📅 ${formatDate(
                                formData.doctorInfo.appointmentDate
                              )}
                            </div>`
                         : ""
                     }
                     ${
                       formData.doctorInfo?.appointmentStartTime &&
                       formData.doctorInfo.appointmentStartTime !==
                         "Not specified"
                         ? `<div class="appointment-item">
                              🕒 ${formData.doctorInfo.appointmentStartTime}
                            </div>`
                         : ""
                     }
                   </div>`
                : ""
            }

            <!-- Prescription Content -->
            ${
              formData.patientInfo?.chiefComplaint ||
              formData.patientInfo?.pastMedicalHistory ||
              formData.patientInfo?.familyMedicalHistory ||
              formData.patientInfo?.physicalExamination
                ? `<div class="prescription-section">
                     <div class="section-header">
                       📋 PATIENT HISTORY
                     </div>
                     <div class="section-content">
                       ${
                         formData.patientInfo?.chiefComplaint &&
                         formData.patientInfo.chiefComplaint !== "Not specified"
                           ? `<div class="detail-item">
                                <div class="detail-label">Chief Complaint</div>
                                <div class="detail-value">${formData.patientInfo.chiefComplaint}</div>
                              </div>`
                           : ""
                       }
                       ${
                         formData.patientInfo?.pastMedicalHistory &&
                         formData.patientInfo.pastMedicalHistory !==
                           "Not provided"
                           ? `<div class="detail-item">
                                <div class="detail-label">Past Medical History</div>
                                <div class="detail-value">${formData.patientInfo.pastMedicalHistory}</div>
                              </div>`
                           : ""
                       }
                       ${
                         formData.patientInfo?.familyMedicalHistory &&
                         formData.patientInfo.familyMedicalHistory !==
                           "Not provided"
                           ? `<div class="detail-item">
                                <div class="detail-label">Family History</div>
                                <div class="detail-value">${formData.patientInfo.familyMedicalHistory}</div>
                              </div>`
                           : ""
                       }
                       ${
                         formData.patientInfo?.physicalExamination &&
                         formData.patientInfo.physicalExamination !==
                           "Not provided"
                           ? `<div class="detail-item">
                                <div class="detail-label">Physical Examination</div>
                                <div class="detail-value">${formData.patientInfo.physicalExamination}</div>
                              </div>`
                           : ""
                       }
                     </div>
                   </div>`
                : ""
            }

            ${
              formData.vitals?.bp ||
              formData.vitals?.bpSystolic ||
              formData.vitals?.bpDiastolic ||
              formData.vitals?.pulseRate ||
              formData.vitals?.temperature ||
              formData.vitals?.spo2 ||
              formData.vitals?.respiratoryRate ||
              formData.vitals?.height ||
              formData.vitals?.weight ||
              formData.vitals?.bmi ||
              formData.vitals?.other
                ? `<div class="prescription-section">
                     <div class="section-header">
                       🩺 VITAL SIGNS
                     </div>
                     <div class="section-content">
                       <div class="vitals-grid">
                         ${
                           formData.vitals?.bp ||
                           (formData.vitals?.bpSystolic &&
                             formData.vitals?.bpDiastolic)
                             ? `<div class="vital-card">
                                  <div class="vital-label">Blood Pressure</div>
                                  <div class="vital-value">
                                    ${
                                      formData.vitals?.bp
                                        ? formData.vitals.bp
                                        : formData.vitals?.bpSystolic &&
                                          formData.vitals?.bpDiastolic
                                        ? `${formData.vitals.bpSystolic}/${formData.vitals.bpDiastolic}`
                                        : null
                                    } mmHg
                                  </div>
                                </div>`
                             : ""
                         }
                         ${
                           formData.vitals?.pulseRate &&
                           formData.vitals.pulseRate !== "Not provided"
                             ? `<div class="vital-card">
                                  <div class="vital-label">Pulse Rate</div>
                                  <div class="vital-value">${formData.vitals.pulseRate} BPM</div>
                                </div>`
                             : ""
                         }
                         ${
                           formData.vitals?.temperature &&
                           formData.vitals.temperature !== "Not provided"
                             ? `<div class="vital-card">
                                  <div class="vital-label">Temperature</div>
                                  <div class="vital-value">${formData.vitals.temperature}°F</div>
                                </div>`
                             : ""
                         }
                         ${
                           formData.vitals?.spo2 &&
                           formData.vitals.spo2 !== "Not provided"
                             ? `<div class="vital-card">
                                  <div class="vital-label">SpO₂</div>
                                  <div class="vital-value">${formData.vitals.spo2}%</div>
                                </div>`
                             : ""
                         }
                         ${
                           formData.vitals?.respiratoryRate &&
                           formData.vitals.respiratoryRate !== "Not provided"
                             ? `<div class="vital-card">
                                  <div class="vital-label">Respiratory Rate</div>
                                  <div class="vital-value">${formData.vitals.respiratoryRate}/min</div>
                                </div>`
                             : ""
                         }
                         ${
                           formData.vitals?.height &&
                           formData.vitals.height !== "Not provided"
                             ? `<div class="vital-card">
                                  <div class="vital-label">Height</div>
                                  <div class="vital-value">${formData.vitals.height} cm</div>
                                </div>`
                             : ""
                         }
                         ${
                           formData.vitals?.weight &&
                           formData.vitals.weight !== "Not provided"
                             ? `<div class="vital-card">
                                  <div class="vital-label">Weight</div>
                                  <div class="vital-value">${formData.vitals.weight} kg</div>
                                </div>`
                             : ""
                         }
                         ${
                           formData.vitals?.bmi &&
                           formData.vitals.bmi !== "Not provided"
                             ? `<div class="vital-card">
                                  <div class="vital-label">BMI</div>
                                  <div class="vital-value">${formData.vitals.bmi}</div>
                                </div>`
                             : ""
                         }
                         ${
                           formData.vitals?.other &&
                           typeof formData.vitals.other === 'object'
                             ? Object.entries(formData.vitals.other)
                                 .map(
                                   ([key, value]) =>
                                     value && value !== "Not provided"
                                       ? `<div class="vital-card">
                                            <div class="vital-label">${key.toUpperCase()}</div>
                                            <div class="vital-value">${value}</div>
                                          </div>`
                                       : ""
                                 )
                                 .join("")
                             : ""
                         }
                       </div>
                     </div>
                   </div>`
                : ""
            }

            ${
              formData.diagnosis?.selectedTests?.length > 0
                ? `<div class="prescription-section">
                     <div class="section-header">
                       🔬 INVESTIGATIONS
                     </div>
                     <div class="section-content">
                       <div class="investigation-grid">
                         ${formData.diagnosis.selectedTests
                           .map(
                             (test, index) =>
                               `<div class="investigation-item">
                                  ${test.testName || test}
                                </div>`
                           )
                           .join("")}
                       </div>
                       ${
                         formData.diagnosis?.testNotes
                           ? `<div class="notes-display">
                                <div class="notes-label">Investigation Notes</div>
                                <div class="notes-content">${formData.diagnosis.testNotes}</div>
                              </div>`
                           : ""
                       }
                     </div>
                   </div>`
                : ""
            }

            ${
              formData.diagnosis?.diagnosisList
                ? `<div class="prescription-section">
                     <div class="section-header">
                       🩺 DIAGNOSIS
                     </div>
                     <div class="section-content">
                       <div class="diagnosis-tags">
                         ${formData.diagnosis.diagnosisList
                           .split(",")
                           .map((diagnosis, index) =>
                             diagnosis.trim()
                               ? `<span class="diagnosis-tag">${diagnosis.trim()}</span>`
                               : ""
                           )
                           .join("")}
                       </div>
                     </div>
                   </div>`
                : ""
            }

            ${
              formData.diagnosis?.medications?.length > 0 ||
              formData.advice?.medicationNotes
                ? `<div class="prescription-section">
                     <div class="section-header">
                       💊 PRESCRIPTION
                     </div>
                     <div class="section-content">
                       ${
                         formData.diagnosis?.medications?.length > 0
                           ? `<table class="medication-table">
                                <thead>
                                  <tr>
                                    <th class="table-header">Type</th>
                                    <th class="table-header">Medicine</th>
                                    <th class="table-header">Dosage</th>
                                    <th class="table-header">Frequency</th>
                                    <th class="table-header">Timing</th>
                                    <th class="table-header">Instructions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  ${formData.diagnosis.medications
                                    .map(
                                      (med, index) => `
                                        <tr>
                                          <td class="table-cell">${
                                            med.medicineType || "Oral"
                                          }</td>
                                          <td class="table-cell">${
                                            med.medName ||
                                            med.name ||
                                            "Not specified"
                                          }</td>
                                          <td class="table-cell">${
                                            med.dosage ||
                                            med.dosagePattern ||
                                            "As directed"
                                          }</td>
                                          <td class="table-cell">${
                                            med.frequency || "As needed"
                                          }</td>
                                          <td class="table-cell">${
                                            med.timings
                                              ? med.timings.join(", ")
                                              : med.timing || "With meals"
                                          }</td>
                                          <td class="table-cell">${
                                            med.notes || "Take as prescribed"
                                          }</td>
                                        </tr>`
                                    )
                                    .join("")}
                                </tbody>
                              </table>`
                           : ""
                       }
                       ${
                         formData.advice?.medicationNotes
                           ? `<div class="notes-display">
                                <div class="notes-label">Additional Instructions</div>
                                <div class="notes-content">${formData.advice.medicationNotes}</div>
                              </div>`
                           : ""
                       }
                     </div>
                   </div>`
                : ""
            }

            ${
              formData.advice?.advice
                ? `<div class="prescription-section">
                     <div class="section-header">
                       💡 MEDICAL ADVICE
                     </div>
                     <div class="section-content">
                       <ul class="advice-list">
                         ${formData.advice.advice
                           .split("\n")
                           .map((item, index) =>
                             item.trim()
                               ? `<li class="advice-item">
                                      <span class="bullet">•</span>
                                      <span>${item}</span>
                                    </li>`
                               : ""
                           )
                           .join("")}
                       </ul>
                     </div>
                   </div>`
                : ""
            }

            ${
              formData.advice?.followUpDate &&
              formatDate(formData.advice.followUpDate)
                ? `<div class="prescription-section">
                     <div class="section-header">
                       📅 FOLLOW-UP
                     </div>
                     <div class="section-content">
                       <div class="follow-up-container">
                         <div class="follow-up-date">
                           Next Appointment: ${formatDate(
                             formData.advice.followUpDate
                           )}
                         </div>
                       </div>
                     </div>
                   </div>`
                : ""
            }

            <!-- Digital Signature -->
            <div class="signature">
              ${
                selectedClinic?.digitalSignature
                  ? `<img src="${selectedClinic.digitalSignature}" alt="Digital Signature" class="digital-signature" />`
                  : formData.doctorInfo?.doctorName &&
                    formData.doctorInfo.doctorName !== "Unknown Doctor"
                  ? `<div style="height: 60px; border-bottom: 1px solid #d1d5db; margin-bottom: 10px;"></div>
                     <div class="signature-text">DR. ${formData.doctorInfo.doctorName}</div>`
                  : ""
              }
              <div class="signature-verified">
                ✅ Digitally Verified E-Prescription
              </div>
            </div>

            <!-- Footer -->
            <div class="prescription-footer">
              <div>This is a computer-generated e-prescription and does not require a physical signature.</div>
              <div>Generated on ${new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })} at ${new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}</div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Configure options for html-pdf-node
    const options = {
      format: "A4",
      margin: {
        top: "5mm",
        right: "5mm",
        bottom: "5mm",
        left: "5mm",
      },
      printBackground: true,
      preferCSSPageSize: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    };

    // Generate PDF using html-pdf-node
    const pdfBuffer = await html_to_pdf.generatePdf(
      { content: htmlContent },
      options
    );

    // Return the PDF buffer
    return pdfBuffer;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error("Failed to generate PDF: " + error.message);
  }
}

module.exports = {
  generatePrescriptionPDF,
};
