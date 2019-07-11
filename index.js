/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */

/**
 * Gets the commit using the diff header
 * @param {import('probot').Context} context
 * @param {string} [method='GET']
 */

const createScheduler = require('probot-scheduler')

module.exports = app => {

  createScheduler(app, {
    delay: !!process.env.DISABLE_DELAY, // delay is enabled on first run
    interval: 100000//24 * 60 * 60 * 1000 // 1 day
  })

  app.on('schedule.repository', context => {
    //this event is triggered once every day, with a random delay
    (async () => {

      context.log("cleaning started")

      createLabel(context, "Dump")
      context.log("fetching pulls")
      const closableItems = await getClosable(context, "pulls")

      for (let item of closableItems.data.items) {
        await context.github.pullRequests.get({ owner: context.payload.repository.owner.login, repo: context.payload.repository.name, number: item.number })
          .then(data => {
            return findBranch(context, data, item.number)
          })
          .catch(error => context.log("No PR found"))
      }
    })();

  })


  async function findBranch(context, pullData, Prnumber) {
    context.log("Processing Branch ", pullData.data.head.ref)
    await context.github.repos.getBranch({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name, branch: pullData.data.head.ref
    })
      .then(data => {
        return reportToUser(context, Prnumber, context.payload.repository.owner.login, context.payload.repository.name, pullData)
      }
      )
      .catch(error => context.log("Branch not found or already deleted"))
  }

  async function reportToUser(context, Prnumber, OwnerName, RepoName, pullData) {
    PRlabels = pullData.data.labels
    labelFound = PRlabels.filter(function (value) { return value.name == "Dump"; })
    if (labelFound.length === 0) {
      context.github.issues.createComment({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name, body: pullData.data.head.ref + " branch is older then 30 days please delete",
        number: Prnumber
      })
      context.log(context.github.issues.addLabels({ labels: ["Dump"], number: Prnumber, owner: OwnerName, repo: RepoName }))
    } else {
      context.log("User already Notified for this PR #" + Prnumber)
    }
    return true
  }

  async function getClosable(context, type) {
    //const staleLabel = "bug"
    const queryTypeRestriction = getQueryTypeRestriction(type)
    //const query = `label:"${staleLabel}" ${queryTypeRestriction}`
    const query = `${queryTypeRestriction}`
    const days = 1
    return search(context, type, days, query)
  }

  function getQueryTypeRestriction(type) {
    if (type === 'pulls') {
      return 'is:pr'
    } else if (type === 'issues') {
      return 'is:issue'
    }
    throw new Error(`Unknown type: ${type}. Valid types are 'pulls' and 'issues'`)
  }
  function since(days) {
    const ttl = days * 24 * 60 * 60 * 1000
    let date = new Date(new Date() - ttl)

    // GitHub won't allow it
    if (date < new Date(0)) {
      date = new Date(0)
    }
    return date
  }
  function search(context, type, days, query) {
    //const { owner, repo } = this.config
    owner = context.payload.repository.owner.login
    repo = context.payload.repository.name
    const timestamp = since(days).toISOString().replace(/\.\d{3}\w$/, '')

    query = `repo:${owner}/${repo} is:merged merged:<=${timestamp} ${query}`

    const params = { q: query, sort: 'updated', order: 'desc', per_page: 30 }

    //this.logger.info(params, 'searching %s/%s for stale issues', "gondhijagapathi", "dummytest") 
    return context.github.search.issues(params)
  }

  async function createLabel(context, label) {
    await context.github.issues.createLabel({
      color: "d73a4a",
      description: "cerner green bot label to tag PR",
      name: label,
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name
    })
      .then(response => context.log("label " + label + " created.."))
      .catch(error => context.log("label already created"))
  }
}


