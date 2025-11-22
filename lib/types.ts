export type UserRole = "super-admin" | "company" | "employee"
export type CompanyStatus = "active" | "suspended" | "pending"

export interface Company {
  id: string
  name: string
  email: string
  phone: string
  address: string
  registrationNumber: string
  employees: number
  totalInventoryItems: number
  status: CompanyStatus
  createdAt: string
  subscriptionPlan: "starter" | "professional" | "enterprise"
}

export interface Employee {
  id: string
  companyId: string
  name: string
  email: string
  role: "manager" | "staff"
  department: string
  status: "active" | "inactive"
  joinedAt: string
  lastActive: string
}

export interface InventoryItem {
  id: string
  companyId: string
  name: string
  reference: string
  category: string
  quantity: number
  alertThreshold: number
  unitPrice: number
  totalValue: number
  location: string
  status: "in-stock" | "low-stock" | "out-of-stock"
  lastUpdated: string
}

export interface InventoryMovement {
  id: string
  itemId: string
  itemName: string
  companyId: string
  type: "entry" | "exit"
  quantity: number
  reason: string
  date: string
  user: string
}

export interface User {
  id: string
  companyId?: string
  name: string
  email: string
  role: UserRole
  lastLogin: string
  status: "active" | "inactive"
}
