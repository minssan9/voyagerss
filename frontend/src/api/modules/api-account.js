import service from "@/api/axios-voyagerss.js";
 
const baesURL = `account` 
const apiAccount = {
  getUser () {
    return service.get(`${baesURL}`)
  },
  getUserById (acconutId) {
    return service.get(`${baesURL}/${acconutId}`)
  },
  putUser(account) {
    return service.put(`${baesURL}`, account)
  },
  putUserById(account) {
    return service.put(`${baesURL}/${account.accountId}`, account)
  },

  
  getTeamsByAccountId(accountId) {
    return service.get(`${baesURL}/${accountId}/team`)
  },

  getSocialLoginUrl (socialType) {
    return `${import.meta.env.VITE_API_URL}/oauth2/authorization/${socialType}?redirect_uri=${import.meta.env.VITE_API_REDIRECT_URL}/auth/redirect`
  },
  getSocialConnect(socialType){
    return `${import.meta.env.VITE_API_URL}/oauth2/auth-url/${socialType}`
  },
  saveAccountSns (providerType, oauth2Info) {
    return service.post(`/oauth2/save/${providerType}`, oauth2Info)
  },

  saveAccountInfo(account) {
    return service.post(`${baesURL}/info`, account)
  },
  getAccountInfo(accountId) {
    return service.get(`${baesURL}/${accountId}/info`)
  },

  saveProfileImg(accountId, profileImage) {
    return service.postFile(`${baesURL}/${accountId}/image`, profileImage)
  },


  

  login(data) {
    return service({
      url: '/auth/login',
      method: 'post',
      data: {
        email: data.email,
        password: data.password
      }
    })
  },

  signup(data) {
    return service({
      url: '/auth/signup',
      method: 'post',
      data: {
        email: data.email,
        username: data.username,
        password: data.password
      }
    })
  },
 
}

export default apiAccount
