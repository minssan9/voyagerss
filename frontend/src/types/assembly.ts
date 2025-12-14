export interface AssemblyMember {
  NAAS_CD: string;
  NAAS_NM: string;
  NAAS_CH_NM: string;
  NAAS_EN_NM: string | null;
  BIRDY_DIV_CD: string;
  BIRDY_DT: string;
  DTY_NM: string | null;
  PLPT_NM: string;
  ELECD_NM: string | null;
  ELECD_DIV_NM: string;
  CMIT_NM: string | null;
  BLNG_CMIT_NM: string;
  RLCT_DIV_NM: string;
  GTELT_ERACO: string;
  NTR_DIV: string;
  NAAS_TEL_NO: string | null;
  NAAS_EMAIL_ADDR: string | null;
  NAAS_HP_URL: string | null;
  AIDE_NM: string | null;
  CHF_SCRT_NM: string | null;
  SCRT_NM: string | null;
  BRF_HST: string | null;
  OFFM_RNUM_NO: string | null;
  NAAS_PIC: string;
}

export interface AssemblyResponse {
  ALLNAMEMBER: [
    {
      head: [
        {
          list_total_count: number;
        },
        {
          RESULT: {
            CODE: string;
            MESSAGE: string;
          }
        }
      ]
    },
    {
      row: AssemblyMember[];
    }
  ]
} 