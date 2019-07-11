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

async function getCommit(context, method = 'GET') {
  if (context.event === 'push') {
    return context.github.repos.getCommit(context.repo({
      method,
      sha: context.payload.head_commit.id,
      headers: { Accept: 'application/vnd.github.diff' }
    }))
  } else {
    return context.github.pulls.get(context.issue({
      method,
      headers: { Accept: 'application/vnd.github.diff' }
    }))
  }
}

module.exports = app => {
  // Your code here

  createScheduler(app, {
    delay: !!process.env.DISABLE_DELAY, // delay is enabled on first run
    interval: 100000//24 * 60 * 60 * 1000 // 1 day
  })
  
  app.on('schedule.repository', context => {
     //this event is triggered once every day, with a random delay
     (async() => {
      console.log('before start')
    
      const closableItems = await getClosable(context,"pulls")
      //console.log(closableItems.data.items)
      
      console.log('after start')

      for(let item of closableItems.data.items){
      console.log("pull details")
      pullData= await context.github.pullRequests.get({owner:context.payload.repository.owner.login,repo:context.payload.repository.name,number:item.number})

      console.log(pullData.data.head.ref)
      await context.github.repos.getBranch({ owner:context.payload.repository.owner.login,
         repo:context.payload.repository.name, branch:pullData.data.head.ref })
         .then(response => context.github.issues.createComment({owner:context.payload.repository.owner.login,
          repo:context.payload.repository.name,body:pullData.data.head.ref+" branch is older then 30 days please delete",
        number:item.number}))
         .catch(error => context.log(error.message))
      }
    })();
    
  })

  async function getClosable (context,type){
    //const staleLabel = "bug"
    const queryTypeRestriction = getQueryTypeRestriction(type)
    //const query = `label:"${staleLabel}" ${queryTypeRestriction}`
    const query = `${queryTypeRestriction}`
    const days = 1
    return search(context,type, days, query)
  }
  
  function getQueryTypeRestriction (type) {
    if (type === 'pulls') {
      return 'is:pr'
    } else if (type === 'issues') {
      return 'is:issue'
    }
    throw new Error(`Unknown type: ${type}. Valid types are 'pulls' and 'issues'`)
  }
  function since (days) {
    const ttl = days * 24 * 60 * 60 * 1000
    let date = new Date(new Date() - ttl)
  
    // GitHub won't allow it
    if (date < new Date(0)) {
      date = new Date(0)
    }
    return date
  }
  function search (context,type, days, query) {
    //const { owner, repo } = this.config
    owner=context.payload.repository.owner.login
    repo=context.payload.repository.name
    const timestamp = since(days).toISOString().replace(/\.\d{3}\w$/, '')
  
    query = `repo:${owner}/${repo} is:merged ${query}`
  
    const params = { q: query, sort: 'updated', order: 'desc', per_page: 30 }
  
    //this.logger.info(params, 'searching %s/%s for stale issues', "gondhijagapathi", "dummytest") updated:<=${timestamp}
    return context.github.search.issues(params)
  }
}


