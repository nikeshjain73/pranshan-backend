const commonStageOfferEmail = ({
  userName,
  stageName,
  offerNo,
  poNo,
  dispatchNo,
  projectName,
  workOrderNo,
  createdBy,
  offerDateTime,
  packageListNo,
  contractorName,
  drawingNo,
module = "",
  remarks = "",
  loginUrl = "",
}) => {

  return `
  
  <div style="
    font-family: Arial, sans-serif;
    background-color: #f4f7fb;
    padding: 30px;
  ">

    <div style="
      max-width: 700px;
      margin: auto;
      background: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #dbe2ea;
    ">

      <div style="
        background: #1e293b;
        color: white;
        padding: 20px 30px;
      ">
        <h2 style="margin:0;">
          Vishal Enterprise System Workflow Notification
        </h2>
      </div>

      <div style="padding: 30px;">

        <p>Hello <strong>${userName}</strong>,</p>

        <p>
         ${remarks}
        </p>

        <table style="
          width:100%;
          border-collapse: collapse;
          margin-top:20px;
        ">

         <tr>
            <td style="padding:10px; border:1px solid #dbe2ea;">
              <strong>Module</strong>
            </td>

            <td style="padding:10px; border:1px solid #dbe2ea;">
              ${module}
            </td>
          </tr>
          <tr>
            <td style="padding:10px; border:1px solid #dbe2ea;">
              <strong>Stage</strong>
            </td>

            <td style="padding:10px; border:1px solid #dbe2ea;">
              ${stageName}
            </td>
          </tr>

${dispatchNo || offerNo || packageListNo || poNo || drawingNo? `
<tr>
 <td style="padding:10px; border:1px solid #dbe2ea;">
  <strong>
    ${
      dispatchNo
        ? "Dispatch No"
        : offerNo
          ? "Offer No"
          : poNo
            ? "PO No"
             : drawingNo
            ? "Drawing No"
            : "Package List No"
    }
  </strong>
</td>

  <td style="padding:10px; border:1px solid #dbe2ea;">
    ${dispatchNo || offerNo || packageListNo || poNo || drawingNo}
  </td>
</tr>
` : ""}

          <tr>
            <td style="padding:10px; border:1px solid #dbe2ea;">
              <strong>Project</strong>
            </td>

            <td style="padding:10px; border:1px solid #dbe2ea;">
              ${projectName}
            </td>
          </tr>
 <tr>
            <td style="padding:10px; border:1px solid #dbe2ea;">
              <strong>Work Order No</strong>
            </td>

            <td style="padding:10px; border:1px solid #dbe2ea;">
              ${workOrderNo}
            </td>
          </tr>
        ${createdBy || contractorName ? `
<tr>
 <td style="padding:10px; border:1px solid #dbe2ea;">
  <strong>
    ${
      createdBy
        ? "Created By"
        : contractorName
          ? "Contractor Name"
            : "-"
    }
  </strong>
</td>

  <td style="padding:10px; border:1px solid #dbe2ea;">
    ${createdBy || contractorName}
  </td>
</tr>
` : ""}

          
  <tr>
            <td style="padding:10px; border:1px solid #dbe2ea;">
              <strong>Date & Time</strong>
            </td>

            <td style="padding:10px; border:1px solid #dbe2ea;">
              ${offerDateTime}
            </td>
          </tr>
         

          

        </table>

       
       
      </div>

    </div>

  </div>

  `;
};

module.exports = commonStageOfferEmail;