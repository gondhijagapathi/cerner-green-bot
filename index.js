/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */

/**
 * Gets the commit using the diff header
 * @param {import('probot').Context} context
 * @param {string} [method='GET']
 */
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
  app.on('pull_request.opened', async context => {
    context.log({ event: context.event, action: context.payload.action })

    const params = context.issue({ body: "Thanks for Contributing to the repo we will get back to you soon!!!" });
    // Post a comment on the issue
    return context.github.issues.createComment(params);
  })

  app.on('pull_request.closed', async context => {
    context.log({ event: context.event, action: context.payload.action })

    if (context.payload.pull_request.merged) {
      const owner = context.payload.repository.owner.login
      const repo = context.payload.repository.name
      const branchName = context.payload.pull_request.head.ref
      const ref = `heads/${branchName}`
      context.log.info(`PR was closed but not merged. Keeping ${owner}/${repo}/${ref}`)
      try {
        await context.github.gitdata.deleteReference({ owner, repo, ref })
        context.log.info(`Successfully deleted ${owner}/${repo}/${ref}`)
      } catch (e) {
        context.log.warn(e, `Failed to delete ${owner}/${repo}/${ref}`)
      }

      const params = context.issue({ body: "PR succesfully closed and branch deleted" });
      // Post a comment on the issue
      return context.github.issues.createComment(params);
    }else{
      const params = context.issue({ body: "PR succesfully closed" });
      // Post a comment on the issue
      return context.github.issues.createComment(params);
    }
  })

  app.on('issues.opened', async context => {
    context.log({ event: context.event, action: context.payload.action })

    const params = context.issue({ body: "Thanks for the issue we will get back to you soon!!!" + context.payload.sender.login });
    // Post a comment on the issue
    //return context.github.issues.createComment(params);
    return context.github.issues.createComment(params)
  })


  app.on('push', async context => {
    context.log({ event: context.event, action: context.payload.action })
    app.log("new push to repository", context.payload.repository.name, context.payload.pusher.name, context.payload.pusher.email)
    const diff = await getCommit(context)
    app.log("Data found = " + diff.data)
    //return context.github.issues.create({title:"hello",body:"hello"})
  })


  app.on('*', async context => {
    context.log({ event: context.event, action: context.payload.action })
  })

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}


