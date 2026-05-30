import { createSlice } from "@reduxjs/toolkit";
const initstate = {
    user: null,
    token: null,
    refreshToken: null,
}

const authSlice = createSlice({
    name: 'auth',
    initialState: initstate,
    reducers: {
        setCredentials: (state, action) => {
            const { user, token, refreshToken } = action.payload;
            if (user !== undefined) {
                state.user = user ? {
                    ...user,
                    isActive: user.isActive ?? true
                } : null;
                if (state.user) {
                    localStorage.setItem('user', JSON.stringify(state.user))
                } else {
                    localStorage.removeItem('user')
                }
            }
            if (token !== undefined) {
                state.token = token
            }
            if (refreshToken !== undefined) {
                state.refreshToken = refreshToken
                if (refreshToken) {
                    localStorage.setItem('refreshToken', refreshToken)
                } else {
                    localStorage.removeItem('refreshToken')
                }
            }
        },

        logOut: () => ({
            user: null,
            token: null,
            refreshToken: null,
        })
    }
})
export const { setCredentials, logOut } = authSlice.actions
export default authSlice.reducer

