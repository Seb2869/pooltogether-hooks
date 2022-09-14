import { Provider } from '@ethersproject/abstract-provider'
import { batch, contract } from '@pooltogether/etherplex'
import { getReadProvider } from '@pooltogether/wallet-connection/dist/utilities/getReadProvider'
import { BigNumber } from 'ethers'
import { useQuery } from 'react-query'
import { TokenFaucetAbi } from '../../abis/TokenFaucet_3_3_12'
import { Token, TokenWithBalance, TokenWithUsdBalance } from '../../types/token'
import { getAmountFromBigNumber } from '../../utils/getAmountFromBigNumber'
import { useTokenFaucetData } from './useTokenFaucetData'
import { V3PrizePool } from './useV3PrizePools'

export const useUsersTokenFaucetRewards = (
  chainId: number,
  usersAddress: string,
  prizePool: V3PrizePool,
  tokenFaucetAddress: string,
  underlyingToken: TokenWithUsdBalance
) => {
  const provider = getReadProvider(chainId)

  const { data: tokenFaucetData, isFetched: isTokenFaucetDataFetched } = useTokenFaucetData(
    chainId,
    tokenFaucetAddress,
    prizePool,
    underlyingToken
  )

  const enabled = isTokenFaucetDataFetched && !!underlyingToken

  return useQuery(
    ['useUsersTokenFaucetRewards', chainId, usersAddress, tokenFaucetAddress],
    () => getTokenFaucetRewards(provider, usersAddress, tokenFaucetAddress, tokenFaucetData),
    { enabled }
  )
}

const getTokenFaucetRewards = async (
  provider: Provider,
  usersAddress: string,
  tokenFaucetAddress: string,
  tokenFaucetData: {
    vapr: number
    dripToken: Token
    dripTokenValueUsd: number
    measureToken: Token
    measureTokenValueUsd: number
  }
): Promise<TokenWithBalance> => {
  const { dripToken } = tokenFaucetData

  // Fetch asset and claimable amount
  const tokenFaucetContract = contract(tokenFaucetAddress, TokenFaucetAbi, tokenFaucetAddress)
  const tokenFaucetResults = await batch(provider, tokenFaucetContract.claim(usersAddress))

  const claimableAmountUnformatted: BigNumber = tokenFaucetResults[tokenFaucetAddress].claim[0]
  const claimableAmount = getAmountFromBigNumber(claimableAmountUnformatted, dripToken.decimals)

  return {
    ...claimableAmount,
    ...dripToken,
    hasBalance: !claimableAmountUnformatted.isZero()
  }
}
