import service, { requestFile } from "@/api/common/axios-voyagerss.js";

const apiAccount = {
  getUser() {
    return service.get('/workschd/account')
  },
  getUserById(accountId) {
    return service.get(`/workschd/accounts/${accountId}`)
  },
  putUser(account) {
    return service.put('/workschd/accounts/profile', account)
  },
  putUserById(account) {
    return service.put(`/workschd/accounts/${account.accountId}`, account)
  },

  getTeamsByAccountId(accountId) {
    return service.get('/workschd/team')
  },

  getSocialLoginUrl(socialType) {
    const base = import.meta.env.VITE_API_BASE_URL || '/api'
    return `${base}/oauth2/authorization/${socialType}?redirect_uri=${import.meta.env.VITE_API_REDIRECT_URL}/auth/redirect`
  },
  getSocialConnect(socialType) {
    const base = import.meta.env.VITE_API_BASE_URL || '/api'
    return `${base}/oauth2/auth-url/${socialType}`
  },
  saveAccountSns(providerType, oauth2Info) {
    return service.post(`/workschd/oauth2/save/${providerType}`, oauth2Info)
  },

  saveAccountInfo(account) {
    return service.post('/workschd/accounts/info', account)
  },
  getAccountInfo(accountId) {
    return service.get(`/workschd/accounts/${accountId}/info`)
  },

  saveProfileImg(accountId, profileImage) {
    const formData = new FormData();
    formData.append('file', profileImage);
    return requestFile('post', `/workschd/accounts/${accountId}/image`, formData)
  },

  login(data) {
    return service({
      url: '/workschd/auth/login',
      method: 'post',
      data: {
        email: data.email,
        password: data.password
      }
    })
  },

  signup(data) {
    return service({
      url: '/workschd/auth/signup',
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
