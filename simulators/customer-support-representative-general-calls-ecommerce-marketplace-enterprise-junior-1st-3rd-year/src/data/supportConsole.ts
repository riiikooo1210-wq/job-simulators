import type { SupportConsoleScenarioId } from '../types/game'

export interface SupportConsoleArticleSection {
  heading: string
  body: string
}

export interface SupportConsoleArticle {
  id: string
  title: string
  category: string
  updated: string
  status: string
  sections: SupportConsoleArticleSection[]
}

export interface SupportConsoleTimelineEvent {
  time: string
  title: string
  detail: string
  status: 'done' | 'active' | 'watch' | 'risk'
}

export interface SupportConsoleCaseData {
  scenarioId: SupportConsoleScenarioId
  queue: {
    line: string
    topic: string
    priority: string
    waitTime: string
    sla: string
  }
  locked: {
    title: string
    searchHint: string
    maskedRows: string[]
  }
  customer: {
    name: string
    initials: string
    tier: string
    accountStatus: string
    contact: string
  }
  caseRecord: {
    caseId: string
    orderId: string
    product: string
    status: string
    owner: string
    disposition: string
  }
  orderSummary: {
    value: string
    deliveryStatus: string
    policyStatus: string
    nextStep: string
  }
  timeline: SupportConsoleTimelineEvent[]
  internalNotes: string[]
  safeActions: string[]
  articles: SupportConsoleArticle[]
}

const sharedCallFlow: SupportConsoleArticle = {
  id: 'shared_call_flow',
  title: 'Inbound call flow',
  category: 'Shared manual',
  updated: 'Current policy',
  status: 'Required',
  sections: [
    {
      heading: 'Before details',
      body: 'Greet the caller, confirm identity, ask what happened, and open CRM before sharing account or order details.',
    },
    {
      heading: 'During lookup',
      body: 'Use only facts found in CRM, tracking, delivery proof, or account notes. Show understanding before explaining policy.',
    },
    {
      heading: 'Close',
      body: 'Summarize the next step and where the customer can check updates. Do not guess, overpromise, blame the carrier, or accuse the customer.',
    },
  ],
}

export const supportConsoleCases: Record<SupportConsoleScenarioId, SupportConsoleCaseData> = {
  order_status: {
    scenarioId: 'order_status',
    queue: {
      line: 'Tier 1 inbound',
      topic: 'Routine order status',
      priority: 'Standard',
      waitTime: '00:42',
      sla: 'Resolve on first contact',
    },
    locked: {
      title: 'Caller not verified',
      searchHint: 'Search by order number, phone, email, or account name after the caller confirms identity.',
      maskedRows: ['Customer profile', 'Order record', 'Tracking timeline'],
    },
    customer: {
      name: 'Mia Lopez',
      initials: 'ML',
      tier: 'Marketplace customer',
      accountStatus: 'Verified after lookup',
      contact: 'App + email updates enabled',
    },
    caseRecord: {
      caseId: 'CASE-18472',
      orderId: 'MM-18472',
      product: 'Stainless-steel lunch container set',
      status: 'Open - call in progress',
      owner: 'Tier 1 queue',
      disposition: 'Order status explained',
    },
    orderSummary: {
      value: '$38.40',
      deliveryStatus: 'Out for delivery today by 8 PM',
      policyStatus: 'No carrier exception',
      nextStep: 'Offer SMS/email delivery notifications and app tracking path.',
    },
    timeline: [
      { time: '7:48 AM', title: 'Carrier scan', detail: 'Out for delivery; no exception reported.', status: 'active' },
      { time: 'Today', title: 'Promised window', detail: 'Delivery due by 8 PM; exact time unavailable.', status: 'watch' },
      { time: 'Now', title: 'Customer need', detail: 'Wants to know whether to stay home.', status: 'active' },
    ],
    internalNotes: ['No refund or carrier trace needed while the window is still active.', 'Do not guarantee an exact delivery time.'],
    safeActions: ['Confirm current tracking exactly.', 'Offer delivery notifications.', 'Explain Account > Orders > Track package.'],
    articles: [
      sharedCallFlow,
      {
        id: 'order_status_manual',
        title: 'Standard order-status calls',
        category: 'Policy article',
        updated: 'Current policy',
        status: 'Required',
        sections: [
          { heading: 'Tracking rule', body: 'State current tracking exactly after lookup. Do not guarantee an exact delivery time unless the carrier provides one.' },
          { heading: 'Customer options', body: 'Offer SMS/email delivery notifications from the order details page and explain the app path.' },
        ],
      },
    ],
  },
  late_delivery: {
    scenarioId: 'late_delivery',
    queue: {
      line: 'Tier 1 inbound',
      topic: 'Late delivery / refund pressure',
      priority: 'Elevated',
      waitTime: '02:18',
      sla: 'Empathy plus allowed options',
    },
    locked: {
      title: 'Late-delivery caller pending verification',
      searchHint: 'Verify identity before opening delivery scans or Mercury Plus account details.',
      maskedRows: ['Customer tier', 'Carrier scan', 'Prior chat history'],
    },
    customer: {
      name: 'Renee Walker',
      initials: 'RW',
      tier: 'Mercury Plus',
      accountStatus: 'Verified after lookup',
      contact: 'Supervisor callback eligible',
    },
    caseRecord: {
      caseId: 'CASE-73918',
      orderId: 'MM-73918',
      product: 'NovaBuds Kids Headphones, blue',
      status: 'Open - delivery complaint',
      owner: 'Tier 1 queue',
      disposition: 'Late-delivery options explained',
    },
    orderSummary: {
      value: '$74.99',
      deliveryStatus: 'In transit with carrier; no final-mile scan yet',
      policyStatus: 'Courtesy credit up to $10 allowed',
      nextStep: 'Explain carrier handoff, credit limit, trace timing, and callback boundary.',
    },
    timeline: [
      { time: 'Yesterday 9:00 PM', title: 'Promised window passed', detail: 'Gift delivery missed birthday window.', status: 'risk' },
      { time: '6:12 AM', title: 'Carrier scan', detail: 'Departed regional sort facility; no final-mile scan.', status: 'active' },
      { time: 'Yesterday chat', title: 'Prior contact', detail: 'No refund or credit was promised.', status: 'done' },
    ],
    internalNotes: ['Mercury Plus account: courtesy credit up to $10 is available.', 'Supervisor callback reviews the same order record and options.'],
    safeActions: ['Acknowledge the missed birthday.', 'Explain carrier handoff plainly.', 'Offer allowed credit, trace timing, and callback boundary.'],
    articles: [
      sharedCallFlow,
      {
        id: 'late_delivery_manual',
        title: 'Late delivery and supervisor requests',
        category: 'Policy article',
        updated: 'Current policy',
        status: 'Required',
        sections: [
          { heading: 'Carrier handoff', body: 'Tier 1 cannot guarantee same-day delivery, cancel shipment, or redirect a package once the carrier has it.' },
          { heading: 'Allowed options', body: 'For confirmed Mercury Plus customers, offer up to a $10 courtesy credit. Carrier trace becomes available after timing or exception rules are met.' },
          { heading: 'Supervisor boundary', body: 'Offer a callback within 2 business hours, but do not say a supervisor will provide a different outcome.' },
        ],
      },
    ],
  },
  risk_refund: {
    scenarioId: 'risk_refund',
    queue: {
      line: 'Tier 1 inbound',
      topic: 'High-value refund review',
      priority: 'Sensitive',
      waitTime: '03:04',
      sla: 'Protect policy and route safely',
    },
    locked: {
      title: 'High-value refund caller pending verification',
      searchHint: 'Verify identity before opening delivery proof, account history, or internal risk notes.',
      maskedRows: ['Delivery proof', 'Account history', 'Risk review notes'],
    },
    customer: {
      name: 'Marcus Reed',
      initials: 'MR',
      tier: 'Marketplace customer',
      accountStatus: 'Verified after lookup',
      contact: 'Lead callback eligible if boundary is needed',
    },
    caseRecord: {
      caseId: 'CASE-88019',
      orderId: 'MM-88019',
      product: '10-inch tablet',
      status: 'Open - delivery investigation',
      owner: 'Trust/Risk review queue',
      disposition: 'Trust/Risk review opened',
    },
    orderSummary: {
      value: '$419.00',
      deliveryStatus: 'Delivered scan with photo and GPS match',
      policyStatus: 'Tier 1 refund blocked; review required',
      nextStep: 'Open delivery investigation and give 24-48 hour review window.',
    },
    timeline: [
      { time: 'Yesterday 6:38 PM', title: 'Delivered scan', detail: 'Delivery photo shows package at front door.', status: 'done' },
      { time: 'Yesterday', title: 'Address proof', detail: 'GPS scan matches account address.', status: 'done' },
      { time: 'Now', title: 'Customer pressure', detail: 'Immediate high-value refund demanded.', status: 'risk' },
    ],
    internalNotes: [
      'Internal only: account opened 38 days ago.',
      'Internal only: two prior high-value refunds in 28 days.',
      'Internal only: prior abusive-contact warning.',
    ],
    safeActions: ['Explain delivery proof neutrally.', 'Do not reveal internal risk signals.', 'Route to Trust/Risk and give 24-48 hour review window.'],
    articles: [
      sharedCallFlow,
      {
        id: 'risk_manual',
        title: 'High-value refund and Trust/Risk review',
        category: 'Policy article',
        updated: 'Current policy',
        status: 'Required',
        sections: [
          { heading: 'Required flow', body: 'Confirm identity, acknowledge concern, state delivery facts without taking sides, and offer a delivery investigation.' },
          { heading: 'Authority limits', body: 'Tier 1 cannot approve an immediate refund when delivery proof exists and risk signals are present. Route to Trust/Risk for 24-48 hour review.' },
          { heading: 'Boundary script', body: 'If insults continue, warn respectfully and offer a lead callback within 1 business day. Do not authorize a Tier 1 override.' },
        ],
      },
    ],
  },
}

export function getSupportConsoleCase(scenarioId: SupportConsoleScenarioId) {
  return supportConsoleCases[scenarioId]
}
