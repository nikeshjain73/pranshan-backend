const commonStageAcceptanceEmail = ({
  userName,
  qcStatus,
  module = "",
  stageName,
  reportNo,
  projectName,
  workOrderNo,
  accptedBy,
  accptanceDateTime,
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

          <tr>
            <td style="padding:10px; border:1px solid #dbe2ea;">
              <strong>Acceptance No</strong>
            </td>

            <td style="padding:10px; border:1px solid #dbe2ea;">
              ${reportNo}
            </td>
          </tr>

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
          <tr>
            <td style="padding:10px; border:1px solid #dbe2ea;">
              <strong>QC By</strong>
            </td>

            <td style="padding:10px; border:1px solid #dbe2ea;">
              ${accptedBy}
            </td>
          </tr>
            <tr>
            <td style="padding:10px; border:1px solid #dbe2ea;">
              <strong>QC Status</strong>
            </td>

            <td style="padding:10px; border:1px solid #dbe2ea;">
              ${qcStatus}
            </td>
          </tr>
  <tr>
            <td style="padding:10px; border:1px solid #dbe2ea;">
              <strong>Date & Time</strong>
            </td>

            <td style="padding:10px; border:1px solid #dbe2ea;">
              ${accptanceDateTime}
            </td>
          </tr>
        

          

        </table>

       
       
      </div>

    </div>

  </div>

  `;
};

module.exports = commonStageAcceptanceEmail;