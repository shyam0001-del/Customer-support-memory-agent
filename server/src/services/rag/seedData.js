import { documentService } from './document.service.js';

export const SEED_DOCUMENTS = [
  {
    title: 'SQL Fundamentals & Relational Querying Guide',
    description: 'Comprehensive review of relational database queries, filter clauses, joins, and grouping mechanics.',
    category: 'SQL',
    role: 'Data Analyst',
    contentType: 'guide',
    tags: ['SQL', 'Database', 'Queries', 'JOIN', 'GROUP BY'],
    source: 'Placement Technical Curriculum',
    content: `SQL (Structured Query Language) is the standard language for storing, manipulating, and retrieving data in relational databases.

1. Order of Execution:
SQL queries are evaluated in a logical sequence different from their written syntax:
FROM & JOIN -> WHERE -> GROUP BY -> HAVING -> SELECT -> DISTINCT -> ORDER BY -> LIMIT / OFFSET.
Understanding this order is critical for writing performant queries and avoiding column alias reference errors in WHERE clauses.

2. SQL Joins:
- INNER JOIN: Returns only rows where there is a match in both joined tables.
- LEFT (OUTER) JOIN: Returns all rows from the left table and matched rows from the right table; unmatched right-side columns populate as NULL.
- RIGHT (OUTER) JOIN: Returns all rows from the right table and matched rows from the left table.
- FULL OUTER JOIN: Returns all rows when there is a match in either table.
- CROSS JOIN: Produces the Cartesian product of rows from both tables.

3. Aggregation and Filtering:
- The WHERE clause filters individual rows before grouping occurs.
- The GROUP BY clause groups rows sharing common attribute values.
- The HAVING clause filters grouped records based on aggregate function outcomes (e.g., HAVING COUNT(*) > 5).

4. Indexing and Optimization:
Relational databases utilize B-Tree indexing to accelerate equality and range queries from O(N) full table scans to O(log N) index lookups. Composite indexes should follow the left-most prefix rule. Avoid applying functions to indexed columns in WHERE clauses (e.g. WHERE YEAR(created_at) = 2024) because it suppresses index usage.`,
  },
  {
    title: 'SQL Window Functions & Analytical Partitioning',
    description: 'Deep dive into OVER, PARTITION BY, ranking functions, and sliding frame aggregations.',
    category: 'SQL',
    role: 'Data Analyst',
    contentType: 'concept',
    tags: ['SQL', 'Window Functions', 'Analytics', 'Partition By', 'Ranking'],
    source: 'Advanced SQL Handbook',
    content: `SQL Window Functions perform analytical calculations across a set of table rows that are related to the current query row, without collapsing the rows into a single summary output like GROUP BY does.

1. Window Function Syntax:
FUNCTION_NAME() OVER (
    PARTITION BY partition_column
    ORDER BY sort_column [ASC|DESC]
    ROWS/RANGE BETWEEN frame_start AND frame_end
)

2. Core Ranking Functions:
- ROW_NUMBER(): Assigns a unique sequential integer to rows within a partition, strictly incrementing even on ties.
- RANK(): Assigns the same rank to identical values, but skips subsequent rank numbers (e.g., 1, 2, 2, 4).
- DENSE_RANK(): Assigns the same rank to identical values without skipping numbers (e.g., 1, 2, 2, 3).
- NTILE(n): Divides partition rows into n roughly equal buckets (e.g., quartiles, deciles).

3. Value and Navigation Functions:
- LAG(column, offset, default): Accesses data from a preceding row in the window frame without self-joins.
- LEAD(column, offset, default): Accesses data from a subsequent row in the window frame.
- FIRST_VALUE() / LAST_VALUE(): Evaluates the earliest or latest value within the current bounded frame.

4. Practical Interview Scenarios:
- Finding top N salaries per department: Use DENSE_RANK() with PARTITION BY department_id ORDER BY salary DESC inside a Common Table Expression (CTE) or subquery where rank <= N.
- Calculating month-over-month growth: Use LAG(revenue, 1) to retrieve previous month revenue and compute (current - previous) / previous * 100.
- Running cumulative totals: SUM(amount) OVER (PARTITION BY customer_id ORDER BY transaction_date ROWS UNBOUNDED PRECEDING).`,
  },
  {
    title: 'DBMS Normalization & Relational Integrity',
    description: 'Formulas and criteria for database normalization from 1NF through BCNF and anomaly prevention.',
    category: 'DBMS',
    role: 'Backend Developer',
    contentType: 'concept',
    tags: ['DBMS', 'Database', 'Normalization', 'BCNF', 'ACID'],
    source: 'System Architecture Reference',
    content: `Database normalization is the structural process of organizing tables and attributes in a relational database to minimize redundancy and prevent modification anomalies.

1. Modification Anomalies:
- Insertion Anomaly: Inability to record certain facts without adding unrelated attributes.
- Deletion Anomaly: Unintended loss of legitimate data when deleting an unrelated entry.
- Update Anomaly: Inconsistent duplicate data when an attribute is modified in one row but not another.

2. Normal Forms:
- First Normal Form (1NF):
  1. Each column contains atomic (indivisible) values.
  2. No repeating groups or arrays within a column.
  3. Each record must be uniquely identifiable via a primary key.

- Second Normal Form (2NF):
  1. Must satisfy 1NF.
  2. No partial functional dependency: every non-prime attribute must depend on the whole candidate key, not a subset (applicable when candidate keys are composite).

- Third Normal Form (3NF):
  1. Must satisfy 2NF.
  2. No transitive functional dependency: non-prime attributes must not depend on other non-prime attributes (X -> Y and Y -> Z where Z depends on non-key Y).

- Boyce-Codd Normal Form (BCNF):
  1. A stricter version of 3NF.
  2. For every functional dependency X -> Y, X must be a super key.

3. ACID Properties:
- Atomicity: Transactions execute completely or rollback entirely.
- Consistency: State transitions preserve all database constraints and schemas.
- Isolation: Concurrent transactions do not interfere with each other (Read Committed, Repeatable Read, Serializable).
- Durability: Committed transaction effects persist reliably even across hardware or power failures.`,
  },
  {
    title: 'Data Structures & Algorithms Interview Core Foundations',
    description: 'Key patterns for technical coding rounds: two pointers, sliding window, trees, and graph algorithms.',
    category: 'DSA',
    role: 'Software Engineer',
    contentType: 'concept',
    tags: ['DSA', 'Algorithms', 'Data Structures', 'Coding', 'Interview'],
    source: 'Engineering Placement Handbook',
    content: `Technical coding interviews assess problem-solving rigor, algorithmic efficiency (Time and Space Complexity), and clean code structure.

1. Core Algorithmic Patterns:
- Two Pointers: Useful for sorted arrays and linked lists (e.g., Two Sum II, Container With Most Water, 3Sum). Reduces O(N^2) brute force to O(N).
- Sliding Window: Dynamically adjusts a contiguous subarray or substring boundary to satisfy a constraint (e.g., Longest Substring Without Repeating Characters, Minimum Window Substring).
- Fast and Slow Pointers (Floyd Cycle Detection): Detects cycles in linked lists or arrays using 1x and 2x traversal pointers.
- Monotonic Stack: Finds the Next Greater Element or Next Smaller Element in O(N) linear time.

2. Tree Traversals:
- Breadth-First Search (BFS): Explores nodes level-by-level using a FIFO queue. Ideal for shortest-path problems on unweighted graphs.
- Depth-First Search (DFS): Explores branches completely using recursion or a LIFO stack (Pre-order, In-order, Post-order).
- Binary Search Tree (BST) property: Left subtree values < root value < right subtree values. In-order traversal of a BST yields strictly ascending sorted order.

3. Graph Algorithms:
- Topological Sort: Orders vertices in a Directed Acyclic Graph (DAG) such that for every directed edge u -> v, u comes before v. Solved using Kahn's algorithm (indegree tracking with BFS queue) or DFS with post-order reversal.
- Dijkstra's Algorithm: Computes single-source shortest paths on non-negative weighted graphs in O((V + E) log V) time using a min-heap priority queue.
- Disjoint Set Union (DSU / Union-Find): Checks connected components and detects cycles in undirected graphs with near-constant O(alpha(N)) amortized operations using path compression and union by rank.`,
  },
  {
    title: 'Data Analyst Placement Preparation & Interview Roadmap',
    description: 'Technical competency expectations, business metrics, and case study interview blueprints for Data Analysts.',
    category: 'Placement',
    role: 'Data Analyst',
    contentType: 'roadmap',
    tags: ['Data Analyst', 'Roadmap', 'Interviews', 'Business Metrics', 'KPIs'],
    source: 'Placement Intelligence Curriculum',
    content: `The Data Analyst role bridges technical data querying with strategic business decision-making. Interview rounds evaluate SQL proficiency, statistical reasoning, spreadsheet modeling, and executive storytelling.

1. Required Technical Pillars:
- Advanced SQL: Window functions (ROW_NUMBER, RANK, DENSE_RANK, LAG, LEAD), multi-table joins, subqueries, Common Table Expressions (CTEs), and aggregation pivots.
- Data Wrangling in Python/R: Pandas DataFrame manipulation, missing value imputation, group-by aggregations, and merge operations.
- Business Intelligence Tools: Dashboard design in Power BI or Tableau (creating calculated fields, DAX measures, parameters, and interactive visual hierarchies).
- Applied Statistics: Hypothesis testing, p-values, A/B testing methodology, confidence intervals, sample size determination, and identifying confounding variables.

2. Core Business Metrics to Master:
- Customer Acquisition Cost (CAC): Total sales & marketing spend / Number of new customers acquired.
- Lifetime Value (LTV): (Average Purchase Value * Purchase Frequency) * Average Customer Lifespan.
- Churn Rate: Lost customers during period / Total customers at start of period.
- Retention Rate: ((Customers at End of Period - New Customers) / Customers at Start) * 100.
- Net Promoter Score (NPS): % Promoters (scores 9-10) - % Detractors (scores 0-6).

3. Communication & Behavioral Tips:
- Structure answers using the STAR method (Situation, Task, Action, Result).
- Focus on the quantifiable business impact: state how insights influenced conversion rates, reduced churn, or optimized operational costs.`,
  },
  {
    title: 'Machine Learning Fundamentals & Model Evaluation',
    description: 'Supervised vs unsupervised paradigms, bias-variance tradeoff, and validation metrics.',
    category: 'Machine Learning',
    role: 'Data Scientist',
    contentType: 'concept',
    tags: ['Machine Learning', 'Data Science', 'Bias-Variance', 'Evaluation', 'ROC-AUC'],
    source: 'AI Engineering Core Series',
    content: `Machine Learning algorithms discover underlying patterns in empirical data to generate predictions or classifications on unseen instances.

1. The Bias-Variance Tradeoff:
- Bias: Error introduced by approximating a real-world problem with an overly simplistic model. High bias leads to underfitting (poor training and test performance).
- Variance: Model sensitivity to small fluctuations in the training set. High variance leads to overfitting (high training accuracy, poor generalizability on test data).
- Total Error = Bias^2 + Variance + Irreducible Error. Regularization techniques (L1 Lasso, L2 Ridge, Dropout) constrain model capacity to achieve optimal balance.

2. Classification Evaluation Metrics:
- Precision: TP / (TP + FP). Accuracy of positive predictions; crucial when false positives are costly (e.g. spam detection).
- Recall (Sensitivity): TP / (TP + FN). Ability to find all actual positives; critical when false negatives are dangerous (e.g. medical diagnosis, fraud detection).
- F1-Score: Harmonic mean of precision and recall: 2 * (Precision * Recall) / (Precision + Recall).
- ROC-AUC: Receiver Operating Characteristic Area Under Curve; plots True Positive Rate vs False Positive Rate across all classification thresholds. AUC = 1.0 represents perfect discrimination.

3. Regression Metrics:
- Mean Absolute Error (MAE): Average magnitude of errors; resilient to outliers.
- Mean Squared Error (MSE) / Root Mean Squared Error (RMSE): Penalizes large errors quadratically.
- R-Squared (Coefficient of Determination): Proportion of variance in the dependent variable explained by model predictors.`,
  },
];

/**
 * Seed knowledge base with standard interview prep documents
 * @param {Object} [options]
 * @param {boolean} [options.force=false]
 * @returns {Promise<Array<Object>>}
 */
export async function seedKnowledgeBase(options = {}) {
  const seeded = [];

  for (const docData of SEED_DOCUMENTS) {
    try {
      // Check if document with title already exists
      const existing = await documentService.listDocuments({ limit: 100 });
      const found = existing.find((d) => d.title === docData.title);

      let docId;
      if (!found) {
        const created = await documentService.createDocument(docData);
        docId = created.id;
      } else {
        docId = found.id;
      }

      // Ingest document into vector store
      const ingestResult = await documentService.ingestDocument(docId, options.force);
      seeded.push({
        title: docData.title,
        docId,
        chunksCount: ingestResult.chunksCount,
        skipped: !!ingestResult.skipped,
      });
    } catch (err) {
      console.warn(`[SeedKnowledge] Failed to seed "${docData.title}":`, err.message);
    }
  }

  console.log(`[SeedKnowledge] Knowledge base initialized with ${seeded.length} document(s).`);
  return seeded;
}
