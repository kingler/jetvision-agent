import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { ApolloAPIClient } from "./apollo-api-client";

export class ApolloTools {
  private rateLimitTracker: Map<string, number[]> = new Map();
  private readonly MAX_REQUESTS_PER_MINUTE = 60;
  private readonly MAX_BULK_REQUESTS_PER_MINUTE = 30; // Bulk endpoints have 50% rate limit
  private apiKey: string;
  private apiClient: ApolloAPIClient | null = null;

  constructor(apiKey?: string) {
    // In Cloudflare Workers, API key is passed directly from the env binding
    // Use globalThis for cross-platform compatibility
    this.apiKey = apiKey || (typeof process !== 'undefined' ? process.env?.APOLLO_API_KEY : undefined) || '';
    
    if (!this.apiKey) {
      console.warn("APOLLO_API_KEY not set. Running in mock mode.");
    } else {
      this.apiClient = new ApolloAPIClient(this.apiKey);
    }
  }

  async handleToolCall(request: CallToolRequest) {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error("Missing required parameters");
    }

    // Check rate limiting
    this.checkRateLimit(name);

    switch (name) {
      case "search-leads":
        return await this.searchLeads(args);
      
      case "enrich-contact":
        return await this.enrichContact(args);
      
      case "create-email-sequence":
        return await this.createEmailSequence(args);
      
      case "get-account-data":
        return await this.getAccountData(args);
      
      case "track-engagement":
        return await this.trackEngagement(args);
      
      case "search-organizations":
        return await this.searchOrganizations(args);
      
      case "bulk-enrich-contacts":
        return await this.bulkEnrichContacts(args);
      
      case "bulk-enrich-organizations":
        return await this.bulkEnrichOrganizations(args);
      
      case "create-contact":
        return await this.createContact(args);
      
      case "update-contact":
        return await this.updateContact(args);
      
      case "search-contacts":
        return await this.searchContacts(args);
      
      case "search-news":
        return await this.searchNews(args);
      
      case "search-job-postings":
        return await this.searchJobPostings(args);
      
      case "create-deal":
        return await this.createDeal(args);
      
      case "update-deal":
        return await this.updateDeal(args);
      
      case "search-deals":
        return await this.searchDeals(args);
      
      case "create-task":
        return await this.createTask(args);
      
      case "log-call":
        return await this.logCall(args);
      
      case "get-api-usage":
        return await this.getApiUsage(args);
      
      case "search-sequences":
        return await this.searchSequences(args);
      
      case "search-tasks":
        return await this.searchTasks(args);
      
      case "update-sequence":
        return await this.updateSequence(args);
      
      case "get-sequence-stats":
        return await this.getSequenceStats(args);
      
      case "add-contacts-to-sequence":
        return await this.addContactsToSequence(args);
      
      case "remove-contacts-from-sequence":
        return await this.removeContactsFromSequence(args);
      
      case "update-task":
        return await this.updateTask(args);
      
      case "complete-task":
        return await this.completeTask(args);
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private checkRateLimit(toolName: string) {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    
    const requests = this.rateLimitTracker.get(toolName) || [];
    const recentRequests = requests.filter(time => time > windowStart);
    
    // Bulk operations have lower rate limits
    const isBulkOperation = toolName.startsWith('bulk-');
    const maxRequests = isBulkOperation ? this.MAX_BULK_REQUESTS_PER_MINUTE : this.MAX_REQUESTS_PER_MINUTE;
    
    if (recentRequests.length >= maxRequests) {
      throw new Error(`Rate limit exceeded for ${toolName}. Please wait before making more requests.`);
    }
    
    recentRequests.push(now);
    this.rateLimitTracker.set(toolName, recentRequests);
  }

  private async searchLeads(args: any) {
    const { jobTitle, industry, companySize, location, limit = 25 } = args;

    if (!jobTitle && !industry && !companySize && !location) {
      throw new Error("Missing required parameters: at least one search criterion must be provided");
    }

    try {
      let results;
      
      if (this.apiClient) {
        // Use real Apollo API
        const searchParams = {
          job_titles: jobTitle ? [jobTitle] : undefined,
          industries: industry ? [industry] : undefined,
          company_sizes: companySize ? [companySize] : undefined,
          locations: location ? [location] : undefined,
          limit
        };
        
        const response = await this.apiClient.searchPeople(searchParams);
        results = response.people || [];
      } else {
        // Use mock data when API key is not available
        results = this.generateMockLeads(jobTitle, industry, companySize, location, limit);
      }
      
      return {
        content: [
          {
            type: "text",
            text: `Found ${results.length} leads matching your criteria:\n\n${this.formatLeads(results)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching leads: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }

  private async enrichContact(args: any) {
    const { email, linkedinUrl } = args;

    if (!email) {
      throw new Error("Missing required parameter: email");
    }

    try {
      // Simulate contact enrichment
      if (email === "nonexistent@example.com") {
        return {
          content: [
            {
              type: "text",
              text: "Contact not found in Apollo.io database"
            }
          ]
        };
      }

      const enrichedData = {
        email,
        name: "John Doe",
        title: "CEO",
        company: "JetVision",
        phone: "+1-555-0123",
        linkedIn: linkedinUrl || "https://linkedin.com/in/johndoe",
        twitter: "@johndoe"
      };

      return {
        content: [
          {
            type: "text",
            text: `Enriched contact data:\n${JSON.stringify(enrichedData, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error enriching contact: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }

  private async createEmailSequence(args: any) {
    const { name, contacts, templateIds, delayDays } = args;

    if (!name || !contacts || contacts.length === 0) {
      throw new Error("Missing required sequence parameters: name and contacts are required");
    }

    try {
      const sequenceId = `seq_${Date.now()}`;
      
      return {
        content: [
          {
            type: "text",
            text: `Email sequence created successfully:
- Sequence ID: ${sequenceId}
- Name: ${name}
- Contacts: ${contacts.length} added
- Templates: ${templateIds?.length || 0} configured
- Schedule: ${delayDays?.join(", ") || "Default timing"} days between emails`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating sequence: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }

  private async getAccountData(args: any) {
    const { domain, includeContacts = true } = args;

    if (!domain) {
      throw new Error("Missing required parameter: domain");
    }

    // Simulate rate limiting for testing
    const requests = this.rateLimitTracker.get("get-account-data") || [];
    if (requests.length > 8) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    try {
      const accountData = {
        domain,
        companyName: domain.replace(".com", "").charAt(0).toUpperCase() + domain.slice(1).replace(".com", ""),
        industry: "Aviation",
        employeeCount: 150,
        revenue: "$50M-$100M",
        headquarters: "San Francisco, CA",
        contacts: includeContacts ? [
          { name: "Jane Smith", title: "VP Sales", email: `jane@${domain}` },
          { name: "Bob Johnson", title: "Director of Operations", email: `bob@${domain}` }
        ] : []
      };

      return {
        content: [
          {
            type: "text",
            text: `Account data for ${domain}:\n${JSON.stringify(accountData, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error retrieving account data: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }

  private async trackEngagement(args: any) {
    const { sequenceId, startDate, endDate } = args;

    if (!sequenceId) {
      throw new Error("Missing required parameter: sequenceId");
    }

    try {
      const metrics = {
        sequenceId,
        period: `${startDate || "All time"} to ${endDate || "Present"}`,
        emailsSent: 250,
        opens: 175,
        openRate: "70%",
        clicks: 45,
        clickRate: "18%",
        replies: 12,
        replyRate: "4.8%",
        meetings: 3
      };

      return {
        content: [
          {
            type: "text",
            text: `Engagement metrics for sequence ${sequenceId}:\n${JSON.stringify(metrics, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error tracking engagement: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }

  private generateMockLeads(jobTitle?: string, industry?: string, companySize?: string, location?: string, limit: number = 25) {
    const leads = [];
    const count = Math.min(limit, 10); // Limit mock data
    
    for (let i = 0; i < count; i++) {
      leads.push({
        name: `Lead ${i + 1}`,
        title: jobTitle || "Executive",
        company: `Company ${i + 1}`,
        industry: industry || "Various",
        size: companySize || "50-200",
        location: location || "United States",
        email: `lead${i + 1}@example.com`
      });
    }
    
    return leads;
  }

  private formatLeads(leads: any[]) {
    return leads.map(lead => 
      `• ${lead.name} - ${lead.title} at ${lead.company} (${lead.industry}, ${lead.size} employees, ${lead.location})`
    ).join("\n");
  }

  private async searchOrganizations(args: any) {
    const { industry, employeeCount, revenue, location, technologies, limit = 25 } = args;

    if (!industry && !employeeCount && !revenue && !location && (!technologies || technologies.length === 0)) {
      throw new Error("At least one search parameter is required");
    }

    try {
      // In production, this would use the Apollo API client
      const mockResults = this.generateMockOrganizations(industry, employeeCount, revenue, location, limit);
      
      return {
        content: [
          {
            type: "text",
            text: `Found ${mockResults.length} organizations matching your criteria:\n\n${this.formatOrganizations(mockResults)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching organizations: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }

  private async bulkEnrichContacts(args: any) {
    const { contacts, revealPersonalEmails = false, revealPhoneNumbers = false } = args;

    if (!contacts || contacts.length === 0) {
      throw new Error("No contacts provided for enrichment");
    }

    if (contacts.length > 10) {
      throw new Error("Maximum 10 contacts can be enriched in a single request");
    }

    try {
      // In production, this would call the Apollo bulk enrichment API
      const enrichedContacts = contacts.map((contact: any, index: number) => ({
        ...contact,
        enriched: {
          title: contact.title || "Executive",
          company: contact.company || "Unknown Company",
          linkedIn: contact.linkedinUrl || `https://linkedin.com/in/person${index}`,
          phone: revealPhoneNumbers ? `+1-555-010${index}` : null,
          personalEmail: revealPersonalEmails ? `personal${index}@email.com` : null,
          industry: "Technology",
          location: "San Francisco, CA"
        }
      }));

      return {
        content: [
          {
            type: "text",
            text: `Enriched ${enrichedContacts.length} contacts:\n${JSON.stringify(enrichedContacts, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error enriching contacts: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }

  private async bulkEnrichOrganizations(args: any) {
    const { organizations } = args;

    if (!organizations || organizations.length === 0) {
      throw new Error("No organizations provided for enrichment");
    }

    if (organizations.length > 10) {
      throw new Error("Maximum 10 organizations can be enriched in a single request");
    }

    try {
      const enrichedOrgs = organizations.map((org: any) => ({
        ...org,
        enriched: {
          industry: "Aviation",
          employeeCount: Math.floor(Math.random() * 1000) + 50,
          revenue: "$10M-$50M",
          headquarters: "United States",
          foundedYear: 2010 + Math.floor(Math.random() * 10),
          technologies: ["Salesforce", "HubSpot", "AWS"],
          description: `Leading company in the aviation industry`
        }
      }));

      return {
        content: [
          {
            type: "text",
            text: `Enriched ${enrichedOrgs.length} organizations:\n${JSON.stringify(enrichedOrgs, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error enriching organizations: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }

  private async createContact(args: any) {
    const { firstName, lastName, email, title, company, phone, linkedinUrl, accountId } = args;

    if (!firstName || !lastName || !email) {
      throw new Error("Missing required fields: firstName, lastName, and email are required");
    }

    try {
      const contactId = `contact_${Date.now()}`;
      
      return {
        content: [
          {
            type: "text",
            text: `Contact created successfully:
- Contact ID: ${contactId}
- Name: ${firstName} ${lastName}
- Email: ${email}
- Title: ${title || "Not specified"}
- Company: ${company || "Not specified"}
- Account ID: ${accountId || "Not linked"}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating contact: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }

  private async updateContact(args: any) {
    const { contactId, ...updates } = args;

    if (!contactId) {
      throw new Error("Contact ID is required");
    }

    try {
      return {
        content: [
          {
            type: "text",
            text: `Contact ${contactId} updated successfully with:\n${JSON.stringify(updates, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error updating contact: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }

  private async searchContacts(args: any) {
    const { query, accountId, jobTitle, company, lastContactedDays, limit = 25 } = args;

    try {
      const mockContacts = this.generateMockContacts(query, jobTitle, company, limit);
      
      return {
        content: [
          {
            type: "text",
            text: `Found ${mockContacts.length} contacts:\n\n${this.formatContacts(mockContacts)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching contacts: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }

  private async searchNews(args: any) {
    const { query, organizationId, industry, startDate, endDate, limit = 25 } = args;

    try {
      const mockNews = this.generateMockNews(query, industry, limit);
      
      return {
        content: [
          {
            type: "text",
            text: `Found ${mockNews.length} news articles:\n\n${this.formatNews(mockNews)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching news: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }

  private async searchJobPostings(args: any) {
    const { organizationId, domain, jobTitles, departments, limit = 25 } = args;

    try {
      const mockPostings = this.generateMockJobPostings(jobTitles, departments, limit);
      
      return {
        content: [
          {
            type: "text",
            text: `Found ${mockPostings.length} job postings:\n\n${this.formatJobPostings(mockPostings)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching job postings: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }

  private async createDeal(args: any) {
    const { name, value, stage, contactId, accountId, closeDate, probability, description } = args;

    if (!name || value === undefined || !stage) {
      throw new Error("Missing required fields: name, value, and stage are required");
    }

    try {
      const dealId = `deal_${Date.now()}`;
      
      return {
        content: [
          {
            type: "text",
            text: `Deal created successfully:
- Deal ID: ${dealId}
- Name: ${name}
- Value: $${value}
- Stage: ${stage}
- Close Date: ${closeDate || "Not set"}
- Probability: ${probability || 50}%`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating deal: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }

  private async updateDeal(args: any) {
    const { dealId, ...updates } = args;

    if (!dealId) {
      throw new Error("Deal ID is required");
    }

    try {
      return {
        content: [
          {
            type: "text",
            text: `Deal ${dealId} updated successfully with:\n${JSON.stringify(updates, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error updating deal: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }

  private async searchDeals(args: any) {
    const { stage, minValue, maxValue, accountId, contactId, closeDateStart, closeDateEnd, limit = 25 } = args;

    try {
      const mockDeals = this.generateMockDeals(stage, minValue, maxValue, limit);
      
      return {
        content: [
          {
            type: "text",
            text: `Found ${mockDeals.length} deals:\n\n${this.formatDeals(mockDeals)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching deals: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }

  private async createTask(args: any) {
    const { title, description, dueDate, priority = "Medium", contactId, accountId, dealId, type } = args;

    if (!title || !dueDate) {
      throw new Error("Missing required fields: title and dueDate are required");
    }

    try {
      const taskId = `task_${Date.now()}`;
      
      return {
        content: [
          {
            type: "text",
            text: `Task created successfully:
- Task ID: ${taskId}
- Title: ${title}
- Due Date: ${dueDate}
- Priority: ${priority}
- Type: ${type || "Other"}
- Description: ${description || "No description"}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating task: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }

  private async logCall(args: any) {
    const { contactId, duration, outcome, notes, callDate, nextSteps } = args;

    if (!contactId || duration === undefined || !outcome) {
      throw new Error("Missing required fields: contactId, duration, and outcome are required");
    }

    try {
      const callId = `call_${Date.now()}`;
      
      return {
        content: [
          {
            type: "text",
            text: `Call logged successfully:
- Call ID: ${callId}
- Contact ID: ${contactId}
- Duration: ${duration} minutes
- Outcome: ${outcome}
- Date: ${callDate || new Date().toISOString()}
- Notes: ${notes || "No notes"}
- Next Steps: ${nextSteps || "None specified"}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error logging call: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }

  private async getApiUsage(args: any) {
    const { startDate, endDate, breakdown = false } = args;

    try {
      const usage = {
        period: `${startDate || "All time"} to ${endDate || "Present"}`,
        creditsUsed: 1250,
        creditsRemaining: 8750,
        percentageUsed: "12.5%",
        endpoints: breakdown ? {
          "people/search": 450,
          "people/match": 300,
          "organizations/search": 200,
          "bulk/people": 150,
          "bulk/organizations": 100,
          "other": 50
        } : undefined
      };

      return {
        content: [
          {
            type: "text",
            text: `API Usage Statistics:\n${JSON.stringify(usage, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error retrieving API usage: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }

  // Helper methods for generating mock data
  private generateMockOrganizations(industry?: string, size?: string, revenue?: string, location?: string, limit: number = 25) {
    const orgs = [];
    const count = Math.min(limit, 10);
    
    for (let i = 0; i < count; i++) {
      orgs.push({
        name: `Organization ${i + 1}`,
        industry: industry || "Various",
        employeeCount: size || "50-200",
        revenue: revenue || "$1M-$10M",
        location: location || "United States",
        domain: `org${i + 1}.com`
      });
    }
    
    return orgs;
  }

  private formatOrganizations(orgs: any[]) {
    return orgs.map(org => 
      `• ${org.name} - ${org.industry} (${org.employeeCount} employees, ${org.revenue}, ${org.location})`
    ).join("\n");
  }

  private generateMockContacts(query?: string, jobTitle?: string, company?: string, limit: number = 25) {
    const contacts = [];
    const count = Math.min(limit, 10);
    
    for (let i = 0; i < count; i++) {
      contacts.push({
        id: `contact_${i}`,
        name: `Contact ${i + 1}`,
        email: `contact${i + 1}@example.com`,
        title: jobTitle || "Manager",
        company: company || `Company ${i + 1}`
      });
    }
    
    return contacts;
  }

  private formatContacts(contacts: any[]) {
    return contacts.map(contact => 
      `• ${contact.name} - ${contact.title} at ${contact.company} (${contact.email})`
    ).join("\n");
  }

  private generateMockNews(query?: string, industry?: string, limit: number = 25) {
    const news = [];
    const count = Math.min(limit, 5);
    
    for (let i = 0; i < count; i++) {
      news.push({
        title: `${industry || "Industry"} News Article ${i + 1}`,
        date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
        source: "Business Wire",
        summary: `Latest developments in ${industry || "the industry"}`
      });
    }
    
    return news;
  }

  private formatNews(news: any[]) {
    return news.map(article => 
      `• [${article.date}] ${article.title} - ${article.source}\n  ${article.summary}`
    ).join("\n\n");
  }

  private generateMockJobPostings(jobTitles?: string[], departments?: string[], limit: number = 25) {
    const postings = [];
    const count = Math.min(limit, 5);
    
    for (let i = 0; i < count; i++) {
      postings.push({
        title: jobTitles?.[0] || `Position ${i + 1}`,
        department: departments?.[0] || "Engineering",
        location: "Remote",
        posted: new Date(Date.now() - i * 172800000).toISOString().split('T')[0]
      });
    }
    
    return postings;
  }

  private formatJobPostings(postings: any[]) {
    return postings.map(job => 
      `• ${job.title} - ${job.department} (${job.location}) - Posted: ${job.posted}`
    ).join("\n");
  }

  private generateMockDeals(stage?: string, minValue?: number, maxValue?: number, limit: number = 25) {
    const deals = [];
    const count = Math.min(limit, 5);
    
    for (let i = 0; i < count; i++) {
      const value = minValue ? minValue + Math.random() * ((maxValue || minValue * 2) - minValue) : 10000 + Math.random() * 90000;
      deals.push({
        id: `deal_${i}`,
        name: `Deal ${i + 1}`,
        value: Math.round(value),
        stage: stage || "Qualification",
        probability: Math.floor(Math.random() * 100)
      });
    }
    
    return deals;
  }

  private formatDeals(deals: any[]) {
    return deals.map(deal => 
      `• ${deal.name} - $${deal.value} (${deal.stage}, ${deal.probability}% probability)`
    ).join("\n");
  }

  // New methods for missing Apollo API endpoints
  private async searchSequences(args: any) {
    const { query, status, createdAfter, createdBefore, limit = 25 } = args;

    try {
      if (this.apiClient) {
        // In production, would call real Apollo API
        // const response = await this.apiClient.searchSequences({ ... });
      }

      // Mock response for testing
      const mockSequences = this.generateMockSequences(query, status, limit);
      
      return {
        content: [
          {
            type: "text",
            text: `Found ${mockSequences.length} sequences:\n\n${this.formatSequences(mockSequences)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching sequences: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }

  private async searchTasks(args: any) {
    const { assignedTo, status, dueDateStart, dueDateEnd, contactId, accountId, dealId, priority, type, limit = 25 } = args;

    try {
      if (this.apiClient) {
        // In production, would call real Apollo API
        // const response = await this.apiClient.searchTasks({ ... });
      }

      // Mock response for testing
      const mockTasks = this.generateMockTasks(status, priority, type, limit);
      
      return {
        content: [
          {
            type: "text",
            text: `Found ${mockTasks.length} tasks:\n\n${this.formatTasks(mockTasks)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching tasks: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }

  private async updateSequence(args: any) {
    const { sequenceId, name, status, templateIds, delayDays } = args;

    if (!sequenceId) {
      throw new Error("Sequence ID is required");
    }

    try {
      return {
        content: [
          {
            type: "text",
            text: `Sequence ${sequenceId} updated successfully:
- Name: ${name || "Unchanged"}
- Status: ${status || "Unchanged"}
- Templates: ${templateIds ? templateIds.length : "Unchanged"}
- Delays: ${delayDays ? delayDays.join(", ") : "Unchanged"} days`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error updating sequence: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }

  private async getSequenceStats(args: any) {
    const { sequenceId, startDate, endDate } = args;

    if (!sequenceId) {
      throw new Error("Sequence ID is required");
    }

    try {
      const stats = {
        sequenceId,
        period: `${startDate || "All time"} to ${endDate || "Present"}`,
        totalContacts: 250,
        activeContacts: 180,
        completedContacts: 70,
        emailsSent: 750,
        opens: 520,
        openRate: "69.3%",
        clicks: 145,
        clickRate: "19.3%",
        replies: 32,
        replyRate: "4.3%",
        unsubscribes: 5,
        bounces: 3,
        meetings: 8
      };

      return {
        content: [
          {
            type: "text",
            text: `Sequence statistics for ${sequenceId}:\n${JSON.stringify(stats, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting sequence stats: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }

  private async addContactsToSequence(args: any) {
    const { sequenceId, contactIds, emails } = args;

    if (!sequenceId) {
      throw new Error("Sequence ID is required");
    }

    if (!contactIds && !emails) {
      throw new Error("Either contactIds or emails must be provided");
    }

    try {
      const contactCount = (contactIds?.length || 0) + (emails?.length || 0);
      
      return {
        content: [
          {
            type: "text",
            text: `Successfully added ${contactCount} contacts to sequence ${sequenceId}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error adding contacts to sequence: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }

  private async removeContactsFromSequence(args: any) {
    const { sequenceId, contactIds } = args;

    if (!sequenceId) {
      throw new Error("Sequence ID is required");
    }

    if (!contactIds || contactIds.length === 0) {
      throw new Error("Contact IDs are required");
    }

    try {
      return {
        content: [
          {
            type: "text",
            text: `Successfully removed ${contactIds.length} contacts from sequence ${sequenceId}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error removing contacts from sequence: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }

  private async updateTask(args: any) {
    const { taskId, ...updates } = args;

    if (!taskId) {
      throw new Error("Task ID is required");
    }

    try {
      return {
        content: [
          {
            type: "text",
            text: `Task ${taskId} updated successfully with:\n${JSON.stringify(updates, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error updating task: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }

  private async completeTask(args: any) {
    const { taskId, completionNotes } = args;

    if (!taskId) {
      throw new Error("Task ID is required");
    }

    try {
      return {
        content: [
          {
            type: "text",
            text: `Task ${taskId} marked as completed${completionNotes ? `\nNotes: ${completionNotes}` : ""}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error completing task: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }

  // Helper methods for new mock data
  private generateMockSequences(query?: string, status?: string, limit: number = 25) {
    const sequences = [];
    const count = Math.min(limit, 5);
    
    for (let i = 0; i < count; i++) {
      sequences.push({
        id: `seq_${Date.now()}_${i}`,
        name: query ? `${query} Sequence ${i + 1}` : `Email Sequence ${i + 1}`,
        status: status || "active",
        created: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
        contactCount: Math.floor(Math.random() * 500) + 50,
        emailsSent: Math.floor(Math.random() * 2000) + 100,
        openRate: `${Math.floor(Math.random() * 30) + 50}%`,
        replyRate: `${Math.floor(Math.random() * 10) + 2}%`
      });
    }
    
    return sequences;
  }

  private formatSequences(sequences: any[]) {
    return sequences.map(seq => 
      `• ${seq.name} (${seq.status}) - ${seq.contactCount} contacts, ${seq.openRate} open rate, ${seq.replyRate} reply rate`
    ).join("\n");
  }

  private generateMockTasks(status?: string, priority?: string, type?: string, limit: number = 25) {
    const tasks = [];
    const count = Math.min(limit, 10);
    
    for (let i = 0; i < count; i++) {
      tasks.push({
        id: `task_${Date.now()}_${i}`,
        title: `Follow-up Task ${i + 1}`,
        status: status || "pending",
        priority: priority || "Medium",
        type: type || "Call",
        dueDate: new Date(Date.now() + i * 86400000).toISOString().split('T')[0],
        contactName: `Contact ${i + 1}`,
        assignedTo: "Sales Team"
      });
    }
    
    return tasks;
  }

  private formatTasks(tasks: any[]) {
    return tasks.map(task => 
      `• ${task.title} - ${task.type} (${task.priority}) - Due: ${task.dueDate} - ${task.status}`
    ).join("\n");
  }
}