/* Api */
import apiAccount from '@/api/modules/api-account'
import apiManager from '@/api/modules/api-manager'
import apiPdf from "@/api/modules/api-pdf";
import apiSys from "@/api/public-modules/api-sys";

const api = {
  accountAPI: apiAccount,
  sysAPI: apiSys,
  managerAPI: apiManager,
  pdfAPI: apiPdf
}

export default api

