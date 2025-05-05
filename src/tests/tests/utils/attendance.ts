import fs from "node:fs";
import moment from "moment";
import csvParser from "csv-parser";
/* models */
import { EmployeeModel } from "@/application/repositories/mongoose/models/employee.model";

type Fields = {
  "Person ID": string;
  Name: string;
  Department: string;
  Time: string;
  "Attendance Check Point": string;
};

type Rows = {
  employeeId: string;
  time: string;
};

type Checks = Record<string, Record<string, [string, string | null]>>;

export async function readCsv(filepath: string) {
  const rows: Rows[] = [];

  await new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(filepath).pipe(csvParser({ strict: true }));

    stream.on("data", (row: Fields) => {
      rows.push({
        time: row["Time"],
        employeeId: row["Person ID"].replaceAll("'", ""),
      });
    });

    stream.on("end", () => resolve());
    stream.on("error", (err) => reject(err));
  });

  return rows;
}

export function sortCsv(rows: Rows[]) {
  return rows.sort((a, b) => {
    const cmp = a.employeeId.localeCompare(b.employeeId);
    if (cmp !== 0) return cmp;
    const timeA = moment(a.time, "DD/MM/YYYY HH:mm");
    const timeB = moment(b.time, "DD/MM/YYYY HH:mm");
    return timeA.diff(timeB);
  });
}

export function getEmployeeChecks(rows: Rows[]) {
  const obj: Checks = {};

  for (const { time, employeeId } of rows) {
    const datetime = moment(time, "DD/MM/YYYY HH:mm");
    const date = datetime.format("DD/MM/YYYY");
    const hour = datetime.format("HH:mm");
    if (!(employeeId in obj)) obj[employeeId] = {};
    if (!(date in obj[employeeId])) obj[employeeId][date] = [] as unknown as [string, string | null];
    obj[employeeId][date].push(hour);
  }

  for (const employeeId in obj) {
    for (const date in obj[employeeId]) {
      const hours = Array.from(new Set(obj[employeeId][date]));
      const min = moment(`${date} ${hours[0]}`, "DD/MM/YYYY HH:mm");
      const max = moment(`${date} ${hours[hours.length - 1]}`, "DD/MM/YYYY HH:mm");
      const diff = max.diff(min, "minutes");
      obj[employeeId][date] = [min.format("HH:mm"), diff >= 60 ? max.format("HH:mm") : null];
    }
  }

  return obj;
}

export async function getAttendanceCount(checks: Checks) {
  let attendanceCount = 0;

  for await (const employeeId of Object.keys(checks)) {
    const employee = await EmployeeModel.findOne({
      status: "activo",
      biometricId: employeeId,
      active: true,
    })
      .lean()
      .exec();

    if (employee != null) {
      for (const date in checks[employeeId]) {
        if (!checks[employeeId][date].includes(null)) {
          const dayName = moment(date, "DD/MM/YYYY").format("dddd").toLowerCase();
          if (
            dayName in employee.schedule &&
            employee.schedule[dayName] != null &&
            Object.keys(employee.schedule[dayName]).length !== 0
          )
            attendanceCount++;
        }
      }
    }
  }

  return attendanceCount;
}

export async function getAutomaticCount(weekStart: string, weekEnd: string) {
  let automaticCount = 0;

  const currentMoment = moment(weekStart, "YYYY-MM-DD").startOf("day");
  const weekEndMoment = moment(weekEnd, "YYYY-MM-DD").startOf("day");
  const autoEmployees = await EmployeeModel.find({ status: "activo", attendanceScheme: "automatic", active: true })
    .lean()
    .exec();

  for (const employee of autoEmployees) {
    const currentMomentCopy = currentMoment.clone();
    while (currentMomentCopy.isSameOrBefore(weekEndMoment, "day")) {
      const dayName = currentMomentCopy.format("dddd").toLowerCase();
      if (
        dayName in employee.schedule &&
        employee.schedule[dayName] != null &&
        Object.keys(employee.schedule[dayName]).length !== 0
      ) {
        automaticCount++;
      }
      currentMomentCopy.add(1, "day");
    }
  }

  return automaticCount;
}
