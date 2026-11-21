export type TransactionListItem = {
  id: string;
  property_id: string;
  propertyName: string | null;
  type: string;
  category: string;
  description: string | null;
  amount: number;
  transaction_date: string;
};
