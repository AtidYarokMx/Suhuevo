import { Router } from "express";
import personalBonusRoutes from "@routes/personal-bonus.routes";
import attendanceRoutes from "@routes/attendance.routes";
import departmentRoutes from "@routes/deparment.routes";
import inventoryRoutes from "@routes/inventory.routes";
import employeeRoutes from "@routes/employee.routes";
import shipmentRoutes from "@routes/shipment.routes";
import scheduleRoutes from "@routes/schedule.routes";
import absenceRoutes from "@routes/absence.routes";
import payrollRoutes from "@routes/payroll.routes";
import holidayRoutes from "@routes/holiday.routes";
import catalogRoutes from "@routes/catalog.routes";
import clientRoutes from "@routes/client.routes";
import bonusRoutes from "@routes/bonus.routes";
import fileRoutes from "@routes/file.routes";
import ruleRoutes from "@routes/rule.routes";
import { authRoutes } from "@routes/auth.routes";
import farmRoutes from "@routes/farm.routes";
import shedRoutes from "@routes/shed.routes";
import jobRoutes from "@routes/job.routes";
import overtimeRoutes from "@routes/overtime.routes";
import swaggerRoutes from "@config/swagger";
import saleRoutes from "@routes/sale.routes";

const router = Router();

// ✅ Rutas generales
router.use("/docs", swaggerRoutes);

// ✅ Rutas de API organizadas
router.use("/api/auth", authRoutes);
router.use("/api/personal-bonus", personalBonusRoutes);
router.use("/api/attendance", attendanceRoutes);
router.use("/api/department", departmentRoutes);
router.use("/api/inventory", inventoryRoutes);
router.use("/api/employee", employeeRoutes);
router.use("/api/schedule", scheduleRoutes);
router.use("/api/overtime", overtimeRoutes);
router.use("/api/shipment", shipmentRoutes);
router.use("/api/absence", absenceRoutes);
router.use("/api/payroll", payrollRoutes);
router.use("/api/catalog", catalogRoutes);
router.use("/api/holiday", holidayRoutes);
router.use("/api/client", clientRoutes);
router.use("/api/bonus", bonusRoutes);
router.use("/api/file", fileRoutes);
router.use("/api/rule", ruleRoutes);
router.use("/api/farm", farmRoutes);
router.use("/api/shed", shedRoutes);
router.use("/api/job", jobRoutes);
router.use("/api/sale", saleRoutes);

export default router;
