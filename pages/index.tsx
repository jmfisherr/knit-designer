import dynamic from 'next/dynamic'
import Head from 'next/head'
import type { NextPage } from 'next'

const GridDesigner = dynamic(() => import('../components/GridDesigner'), { ssr: false })

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Knit Designer</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <GridDesigner />
    </>
  )
}

export default Home
