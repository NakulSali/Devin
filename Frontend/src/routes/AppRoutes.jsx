import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from '../screen/Login'
import Register from '../screen/Register'
import Home from '../screen/Home'
import Project from '../screen/Project'
import { UserAuth } from '../auth/UserAuth'

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UserAuth><Home /></UserAuth>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/project" element={<UserAuth><Project /></UserAuth>} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes