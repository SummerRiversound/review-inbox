// types/index.d.ts spells the inbox's shapes out, since `claude plugin validate` wants the mod's state
// contract self-contained, and shared/types.ts holds the same shapes for the plugin. Exact equality, optional
// fields included: a field added, dropped or changed on one side only fails this typecheck.
import type * as Contract from '../../types'
import type * as Shared from '../shared/types'

type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false
type Holds<T extends true> = T

export type ContractMatches = [
  Holds<Equals<Contract.Impact, Shared.Impact>>,
  Holds<Equals<Contract.Note, Shared.Note>>,
  Holds<Equals<Contract.CardDetails, Shared.CardDetails>>,
  Holds<Equals<Contract.InboxItem, Shared.InboxItem>>,
  Holds<Equals<Contract.Severity, Shared.Severity>>,
  Holds<Equals<Contract.Verdict, Shared.Verdict>>,
  Holds<Equals<Contract.Finding, Shared.Finding>>,
  Holds<Equals<Contract.AutoResult, Shared.AutoResult>>,
  Holds<Equals<Contract.AutoJob, Shared.AutoJob>>,
  Holds<Equals<Contract.PostedReview, Shared.PostedReview>>,
  Holds<Equals<Contract.AutoReviewFile, Shared.AutoReviewFile>>,
  Holds<Equals<Contract.AutoState, Shared.AutoState>>,
  Holds<Equals<Contract.MyPrState, Shared.MyPrState>>,
  Holds<Equals<Contract.MyPr, Shared.MyPr>>,
  Holds<Equals<Contract.TaskKind, Shared.TaskKind>>,
  Holds<Equals<Contract.IssueKind, Shared.IssueKind>>,
  Holds<Equals<Contract.IssueItem, Shared.IssueItem>>,
  Holds<Equals<Contract.Tab, Shared.Tab>>,
  Holds<Equals<Contract.Sort, Shared.Sort>>,
  Holds<Equals<Contract.ButtonScope, Shared.ButtonScope>>,
  Holds<Equals<Contract.CardButton, Shared.CardButton>>,
  Holds<Equals<Contract.GroupScope, Shared.GroupScope>>,
  Holds<Equals<Contract.SearchGroup, Shared.SearchGroup>>,
  Holds<Equals<Contract.GroupHit, Shared.GroupHit>>,
  Holds<Equals<Contract.GroupResult, Shared.GroupResult>>,
  Holds<Equals<Contract.Thread, Shared.Thread>>,
  Holds<Equals<Contract.Activity, Shared.Activity>>,
  Holds<Equals<Contract.Settling, Shared.Settling>>,
  Holds<Equals<Contract.DirectAction, Shared.DirectAction>>,
  Holds<Equals<Contract.DirectTarget, Shared.DirectTarget>>,
  Holds<Equals<Contract.Confirming, Shared.Confirming>>,
  Holds<Equals<Contract.DirectResult, Shared.DirectResult>>,
  Holds<Equals<Contract.ButtonError, Shared.ButtonError>>,
  Holds<Equals<Contract.Actions, Shared.Actions>>,
  Holds<Equals<Contract.Presence, Shared.Presence>>,
  Holds<Equals<Contract.RepoPaths, Shared.RepoPaths>>,
  Holds<Equals<Contract.Capped, Shared.Capped>>,
  Holds<Equals<Contract.InboxFile, Shared.InboxFile>>,
  Holds<Equals<Contract.InboxStatus, Shared.InboxStatus>>,
]
