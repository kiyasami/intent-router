import {
  RouteCommandDef,
  createRouteCommandData,
  defineRouteCommand,
  routeParamMatchers,
} from "@intent-router/core";

const ACCOUNT_NUMBER_PATTERN =
  /\b(?:acct|account|account number)[\s:#-]*([A-Za-z0-9-]{4,})\b/gi;
const CARD_NUMBER_PATTERN =
  /\b(?:card|card number|debit card|credit card)[\s:#-]*([A-Za-z0-9-]{4,})\b/gi;
const TRANSFER_REFERENCE_PATTERN =
  /\b(?:transfer|wire|payment|reference|ref)[\s:#-]*([A-Za-z0-9-]{4,})\b/gi;
const CUSTOMER_ID_PATTERN =
  /\b(?:customer|customer id|cif|client)[\s:#-]*([A-Za-z0-9-]{4,})\b/gi;
const LOAN_NUMBER_PATTERN =
  /\b(?:loan|loan number|loan id)[\s:#-]*([A-Za-z0-9-]{4,})\b/gi;
const CASE_REFERENCE_PATTERN =
  /\b(?:case|dispute|claim|ticket)[\s:#-]*([A-Za-z0-9-]{4,})\b/gi;

export const commands: RouteCommandDef[] = [
  defineRouteCommand({
    id: "accounts.overview",
    title: "Accounts Overview",
    synonyms: ["accounts", "balances", "my accounts", "portfolio"],
    keywords: ["checking", "savings", "account summary"],
    group: "Accounts",
    data: createRouteCommandData({ pathname: "/accounts" }),
  }),
  defineRouteCommand({
    id: "accounts.detail",
    title: "Open Account Details",
    synonyms: ["account detail", "account info", "open account", "account number"],
    keywords: ["balance", "transactions", "account lookup"],
    group: "Accounts",
    data: createRouteCommandData(
      { pathname: "/accounts/:accountId" },
      [
        {
          name: "accountId",
          kind: "identifier",
          pathKey: "accountId",
          hints: ["acct", "account", "account number"],
          pattern: ACCOUNT_NUMBER_PATTERN,
        },
      ]
    ),
  }),
  defineRouteCommand({
    id: "accounts.transactions",
    title: "Search Account Transactions",
    synonyms: ["transactions", "statement", "account activity", "ledger"],
    keywords: ["debits", "credits", "search activity"],
    group: "Accounts",
    data: createRouteCommandData(
      { pathname: "/accounts/transactions" },
      [
        {
          name: "account",
          kind: "identifier",
          queryKey: "account",
          hints: ["acct", "account", "account number"],
          pattern: ACCOUNT_NUMBER_PATTERN,
        },
      ]
    ),
  }),
  defineRouteCommand({
    id: "transfers.new",
    title: "Create Transfer",
    synonyms: ["transfer money", "send money", "move funds", "make transfer"],
    keywords: ["wire", "ach", "payment", "new transfer"],
    group: "Payments",
    data: createRouteCommandData({ pathname: "/payments/transfers/new" }),
  }),
  defineRouteCommand({
    id: "transfers.track",
    title: "Track Transfer",
    synonyms: ["track transfer", "wire status", "payment status", "transfer ref"],
    keywords: ["reference", "tracking", "pending transfer"],
    group: "Payments",
    data: createRouteCommandData(
      { pathname: "/payments/transfers/status" },
      [
        {
          name: "reference",
          kind: "identifier",
          queryKey: "reference",
          hints: ["transfer", "wire", "payment", "reference", "ref"],
          pattern: TRANSFER_REFERENCE_PATTERN,
        },
      ]
    ),
  }),
  defineRouteCommand({
    id: "cards.lookup",
    title: "Open Card Details",
    synonyms: ["card details", "debit card", "credit card", "card lookup"],
    keywords: ["card controls", "freeze card", "replace card"],
    group: "Cards",
    data: createRouteCommandData(
      { pathname: "/cards/details" },
      [
        {
          name: "card",
          kind: "identifier",
          queryKey: "card",
          hints: ["card", "card number", "debit card", "credit card"],
          pattern: CARD_NUMBER_PATTERN,
        },
      ]
    ),
  }),
  defineRouteCommand({
    id: "cards.controls",
    title: "Manage Card Controls",
    synonyms: ["card controls", "lock card", "freeze card", "unfreeze card"],
    keywords: ["limits", "travel notice", "disable card"],
    group: "Cards",
    data: createRouteCommandData({ pathname: "/cards/controls" }),
  }),
  defineRouteCommand({
    id: "customers.search",
    title: "Search Customers",
    synonyms: ["customer search", "find customer", "client lookup", "customer profile"],
    keywords: ["retail customer", "business customer", "search profile"],
    group: "Customers",
    data: createRouteCommandData({ pathname: "/customers/search" }),
  }),
  defineRouteCommand({
    id: "customers.byEmail",
    title: "Find Customer by Email",
    synonyms: ["email customer", "customer email", "lookup email"],
    keywords: ["contact email", "email lookup"],
    group: "Customers",
    data: createRouteCommandData(
      { pathname: "/customers/search" },
      [routeParamMatchers.email({ queryKey: "email" })]
    ),
  }),
  defineRouteCommand({
    id: "customers.byPhone",
    title: "Find Customer by Phone",
    synonyms: ["phone customer", "mobile customer", "lookup phone"],
    keywords: ["contact number", "sms number"],
    group: "Customers",
    data: createRouteCommandData(
      { pathname: "/customers/search" },
      [routeParamMatchers.phone({ queryKey: "phone" })]
    ),
  }),
  defineRouteCommand({
    id: "customers.byId",
    title: "Find Customer by CIF",
    synonyms: ["customer id", "cif", "client id", "customer number"],
    keywords: ["profile id", "lookup cif"],
    group: "Customers",
    data: createRouteCommandData(
      { pathname: "/customers/profile" },
      [
        {
          name: "customerId",
          kind: "identifier",
          queryKey: "customerId",
          hints: ["customer", "customer id", "cif", "client"],
          pattern: CUSTOMER_ID_PATTERN,
        },
      ]
    ),
  }),
  defineRouteCommand({
    id: "loans.detail",
    title: "Open Loan Details",
    synonyms: ["loan details", "loan account", "loan lookup", "mortgage"],
    keywords: ["loan balance", "repayment", "amortization"],
    group: "Loans",
    data: createRouteCommandData(
      { pathname: "/loans/details" },
      [
        {
          name: "loanId",
          kind: "identifier",
          queryKey: "loanId",
          hints: ["loan", "loan number", "loan id"],
          pattern: LOAN_NUMBER_PATTERN,
        },
      ]
    ),
  }),
  defineRouteCommand({
    id: "disputes.case",
    title: "Open Dispute Case",
    synonyms: ["dispute case", "charge dispute", "claim", "fraud case"],
    keywords: ["ticket", "case lookup", "chargeback"],
    group: "Service",
    data: createRouteCommandData(
      { pathname: "/service/disputes" },
      [
        {
          name: "case",
          kind: "identifier",
          queryKey: "case",
          hints: ["case", "dispute", "claim", "ticket"],
          pattern: CASE_REFERENCE_PATTERN,
        },
      ]
    ),
  }),
  defineRouteCommand({
    id: "kyc.review",
    title: "Review KYC Queue",
    synonyms: ["kyc", "kyc queue", "compliance review", "document review"],
    keywords: ["verification", "onboarding", "pending review"],
    group: "Compliance",
    data: createRouteCommandData({ pathname: "/compliance/kyc" }),
  }),
  defineRouteCommand({
    id: "fraud.alerts",
    title: "Fraud Alerts Dashboard",
    synonyms: ["fraud alerts", "fraud dashboard", "risk alerts", "monitor alerts"],
    keywords: ["suspicious activity", "alerts", "risk review"],
    group: "Compliance",
    data: createRouteCommandData({ pathname: "/risk/fraud-alerts" }),
  }),
];

export const scenarioQueries = [
  { label: "Account overview", query: "show my accounts" },
  { label: "Account detail", query: "open account 00981234" },
  { label: "Transactions", query: "transactions for account 00981234" },
  { label: "Transfer status", query: "track wire ref TRX-20491" },
  { label: "Create transfer", query: "send money to another account" },
  { label: "Card detail", query: "card 4455" },
  { label: "Customer email", query: "customer jane.doe@northbank.com" },
  { label: "Customer phone", query: "call customer +1 (555) 123-4567" },
  { label: "Customer CIF", query: "find cif CUST-8821" },
  { label: "Loan detail", query: "loan LN-77881" },
  { label: "Dispute case", query: "dispute case DSP-4102" },
  { label: "Fraud alerts", query: "show fraud alerts dashboard" },
];
