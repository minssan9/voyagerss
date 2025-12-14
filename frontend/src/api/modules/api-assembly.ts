import axios from 'axios'

const ASSEMBLY_API_URL = 'https://open.assembly.go.kr/portal/openapi/ALLNAMEMBER'
const ASSEMBLY_MEMBER_API_URL = 'http://apis.data.go.kr/9710000/NationalAssemblyInfoService/getMemberCurrStateList'

interface AssemblyParams {
  pIndex?: string | number;
  pSize?: string | number;
  Type?: string;
}
 

// Helper function to convert XML to JSON
function xmlToJson(xml: string) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xml, 'text/xml');
  
  function elementToObj(element: Element): any {
    const obj: any = {};
    
    for (const child of element.children) {
      // Handle items array
      if (child.tagName === 'items') {
        obj.items = Array.from(child.children).map(item => elementToObj(item));
        continue;
      }
      
      // Handle regular elements
      const value = child.children.length > 0 
        ? elementToObj(child) 
        : child.textContent;
        
      obj[child.tagName] = value;
    }
    
    return obj;
  }
  
  return elementToObj(xmlDoc.documentElement);
}

export default {
  getMembers: async (params: AssemblyParams = {}) => {
    const defaultParams = {
      KEY: import.meta.env.VITE_DATA_ASSEMBLY_KEY,
      Type: 'json',
      pIndex: params.pIndex,
      pSize: params.pSize
    }

    const queryString = new URLSearchParams(
      Object.fromEntries(
        Object.entries({ ...defaultParams, ...params })
          .map(([key, value]) => [key, String(value)])
      )
    ).toString()

    const response = await axios.get(`${ASSEMBLY_API_URL}?${queryString}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    return response.data
  },

  // New method to get current member list
  getMemberList: async (params: AssemblyParams = { pIndex: 1, pSize: 10 }) => {
    const defaultParams = {
      serviceKey: import.meta.env.VITE_DATA_PUBLIC_KEY,
      numOfRows: params.pSize,
      pageNo: params.pIndex
    }

    const queryString = new URLSearchParams(
      Object.fromEntries(
        Object.entries(defaultParams)
          .map(([key, value]) => [key, String(value)])
      )
    ).toString()

    const response = await axios.get(`${ASSEMBLY_MEMBER_API_URL}?${queryString}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml'
      },
      responseType: 'text'  // Important: get response as text
    })

    // Convert XML to JSON
    const jsonData = xmlToJson(response.data)
    
    return {
      header: jsonData.header,
      items: jsonData.body.items,
      pageInfo: {
        numOfRows: Number(jsonData.body.numOfRows),
        pageNo: Number(jsonData.body.pageNo),
        totalCount: Number(jsonData.body.totalCount)
      }
    }
  }
} 