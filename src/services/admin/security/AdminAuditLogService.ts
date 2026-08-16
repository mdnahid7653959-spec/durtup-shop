import { db } from "@/integrations/firebase/client";
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from "firebase/firestore";

export interface AuditLogEntry {
  id?: string;
  adminId: string;
  adminEmail: string;
  adminRole: string;
  action: string;
  module: string;
  details: string;
  targetId?: string;
  status: "SUCCESS" | "FAILED" | "WARNING";
  ipAddress?: string;
  userAgent?: string;
  createdAt?: any;
}

export class AdminAuditLogService {
  private static COLLECTION = "admin_activity_logs";

  public static async logAction(entry: Omit<AuditLogEntry, "createdAt">): Promise<void> {
    try {
      await addDoc(collection(db, this.COLLECTION), {
        ...entry,
        userAgent: entry.userAgent || typeof navigator !== "undefined" ? navigator.userAgent : "Desktop Admin",
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Failed to write admin audit log:", error);
    }
  }

  public static async getRecentLogs(maxCount = 50): Promise<AuditLogEntry[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        orderBy("createdAt", "desc"),
        limit(maxCount)
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AuditLogEntry[];
    } catch (error) {
      console.error("Failed to fetch admin audit logs:", error);
      return [];
    }
  }
}
