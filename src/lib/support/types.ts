import type {
  SupportTicketCategory,
  SupportTicketStatus,
} from "@/lib/support/labels";

export type OrgSupportMessage = {
  id: string;
  body: string;
  authorName: string | null;
  createdAt: string;
  isFromPlatform: boolean;
};

export type OrgSupportTicket = {
  id: string;
  subject: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  messages: OrgSupportMessage[];
  createdAt: string;
  updatedAt: string;
};

export type OrgSupportOverview = {
  tickets: OrgSupportTicket[];
  openCount: number;
};
