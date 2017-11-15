/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2017 School of Business and Engineering Vaud, Comem
 * Licensed under the MIT License
 */
package com.wegas.core.ejb;

import com.wegas.core.exception.internal.WegasNoResultException;
import com.wegas.core.persistence.variable.VariableInstance;
import com.wegas.core.persistence.variable.primitive.NumberDescriptor;
import com.wegas.core.persistence.variable.primitive.NumberInstance;
import com.wegas.core.persistence.variable.primitive.TextDescriptor;
import com.wegas.core.persistence.variable.primitive.TextInstance;
import com.wegas.core.persistence.variable.scope.GameModelScope;
import com.wegas.core.persistence.variable.scope.GameScope;
import com.wegas.core.persistence.variable.scope.PlayerScope;
import com.wegas.core.persistence.variable.scope.TeamScope;
import com.wegas.test.arquillian.AbstractArquillianTest;
import java.util.List;
import javax.naming.NamingException;
import org.junit.Assert;
import static org.junit.Assert.assertEquals;
import org.junit.Test;

/**
 *
 * @author maxence
 */
public class ScopeTest extends AbstractArquillianTest {

    @Test
    public void createVariableTest() throws NamingException {

        final NumberDescriptor myNumber = new NumberDescriptor();
        myNumber.setName("mynumber");
        myNumber.setDefaultInstance(new NumberInstance(0));
        variableDescriptorFacade.create(scenario.getId(), myNumber);

        team = teamFacade.find(team.getId());
        team.getPrivateInstances();
        assertEquals(1, team.getPrivateInstances().size());
    }

    @Test
    public void getInstances() {
        this.createSecondTeam();

        TextDescriptor gmScoped = new TextDescriptor();
        gmScoped.setName("gmScoped");
        gmScoped.setScope(new GameModelScope());
        gmScoped.setDefaultInstance(new TextInstance());

        TextDescriptor gScoped = new TextDescriptor();
        gScoped.setName("gScoped");
        gScoped.setScope(new GameScope());
        gScoped.setDefaultInstance(new TextInstance());

        TextDescriptor tScoped = new TextDescriptor();
        tScoped.setName("tScoped");
        tScoped.setScope(new TeamScope());
        tScoped.setDefaultInstance(new TextInstance());

        TextDescriptor pScoped = new TextDescriptor();
        pScoped.setName("pScoped");
        pScoped.setScope(new PlayerScope());
        pScoped.setDefaultInstance(new TextInstance());

        logger.error("CREATE NEW DESCRIPTORS");

        variableDescriptorFacade.create(scenario.getId(), gmScoped);
        variableDescriptorFacade.create(scenario.getId(), gScoped);
        variableDescriptorFacade.create(scenario.getId(), tScoped);
        variableDescriptorFacade.create(scenario.getId(), pScoped);

        List<VariableInstance> instances = playerFacade.getInstances(player.getId());

        /* One global instance */
        Assert.assertEquals(1, gameModelFacade.find(scenario.getId()).getPrivateInstances().size());

        /* One quite-global instance */
        Assert.assertEquals(1, gameFacade.find(game.getId()).getPrivateInstances().size());

        /* each team own one instance */
        Assert.assertEquals(1, teamFacade.find(team.getId()).getPrivateInstances().size());
        Assert.assertEquals(1, teamFacade.find(team2.getId()).getPrivateInstances().size());

        /* each player owns one instance */
        Assert.assertEquals(1, playerFacade.find(player.getId()).getPrivateInstances().size());
        Assert.assertEquals(1, playerFacade.find(player21.getId()).getPrivateInstances().size());
        Assert.assertEquals(1, playerFacade.find(player22.getId()).getPrivateInstances().size());

        Assert.assertEquals(4, instances.size());
    }

    @Test
    public void testBroadcast() throws WegasNoResultException {

        this.createSecondTeam();

        TextDescriptor gmScoped = new TextDescriptor();
        gmScoped.setName("gmScoped");
        gmScoped.setScope(new GameModelScope());
        gmScoped.setDefaultInstance(new TextInstance());

        TextDescriptor gScoped = new TextDescriptor();
        gScoped.setName("gScoped");
        gScoped.setScope(new GameScope());
        gScoped.setDefaultInstance(new TextInstance());

        TextDescriptor tScoped = new TextDescriptor();
        tScoped.setName("tScoped");
        tScoped.setScope(new TeamScope());
        tScoped.setDefaultInstance(new TextInstance());

        TextDescriptor tScoped_gs = new TextDescriptor();
        tScoped_gs.setName("tScoped_gs");
        tScoped_gs.setScope(new TeamScope());
        tScoped_gs.getScope().setBroadcastScope("GameScope");
        tScoped_gs.setDefaultInstance(new TextInstance());

        TextDescriptor pScoped = new TextDescriptor();
        pScoped.setName("pScoped");
        pScoped.setScope(new PlayerScope());
        pScoped.setDefaultInstance(new TextInstance());

        TextDescriptor pScoped_ts = new TextDescriptor();
        pScoped_ts.setName("pScoped_ts");
        pScoped_ts.setScope(new PlayerScope());
        pScoped_ts.getScope().setBroadcastScope("TeamScope");
        pScoped_ts.setDefaultInstance(new TextInstance());

        TextDescriptor pScoped_gs = new TextDescriptor();
        pScoped_gs.setName("pScoped_gs");
        pScoped_gs.setScope(new PlayerScope());
        pScoped_gs.getScope().setBroadcastScope("GameScope");
        pScoped_gs.setDefaultInstance(new TextInstance());

        variableDescriptorFacade.create(scenario.getId(), gmScoped);
        variableDescriptorFacade.create(scenario.getId(), gScoped);
        variableDescriptorFacade.create(scenario.getId(), tScoped);
        variableDescriptorFacade.create(scenario.getId(), tScoped_gs);
        variableDescriptorFacade.create(scenario.getId(), pScoped);
        variableDescriptorFacade.create(scenario.getId(), pScoped_ts);
        variableDescriptorFacade.create(scenario.getId(), pScoped_gs);

        login(user21);

        // GameModelScope -> everybody got the same instance
        Assert.assertEquals(variableDescriptorFacade.find(scenario, "gmScoped").getInstance(player), variableDescriptorFacade.find(scenario, "gmScoped").getInstance(player21));
        Assert.assertEquals(variableDescriptorFacade.find(scenario, "gmScoped").getInstance(player21), variableDescriptorFacade.find(scenario, "gmScoped").getInstance(player22));

        // GameScope -> everybody got the same instance
        Assert.assertEquals(variableDescriptorFacade.find(scenario, "gScoped").getInstance(player), variableDescriptorFacade.find(scenario, "gScoped").getInstance(player21));
        Assert.assertEquals(variableDescriptorFacade.find(scenario, "gScoped").getInstance(player21), variableDescriptorFacade.find(scenario, "gScoped").getInstance(player22));

        // TeamScope
        // player in team2 got the same instance
        Assert.assertEquals(variableDescriptorFacade.find(scenario, "tScoped").getInstance(player21), variableDescriptorFacade.find(scenario, "tScoped").getInstance(player22));
        try {
            variableDescriptorFacade.find(scenario, "tScoped").getInstance(player);
            Assert.fail("Instance from another team should not be readable");
        } catch (Exception ex) {
            // expected exeption
        }

        // TeamScope broadasted to the whole game
        // player in team2 got the same instance
        Assert.assertEquals(variableDescriptorFacade.find(scenario, "tScoped_gs").getInstance(player21), variableDescriptorFacade.find(scenario, "tScoped_gs").getInstance(player22));
        variableDescriptorFacade.find(scenario, "tScoped_gs").getInstance(player);

        // PlayerScope
        // player i
        variableDescriptorFacade.find(scenario, "pScoped").getInstance(player21); // self instance, no-problem
        try {
            variableDescriptorFacade.find(scenario, "pScoped").getInstance(player22);
            Assert.fail("Instances from other players should not be readable");
        } catch (Exception ex) {
            // expected exeption
        }

        try {
            variableDescriptorFacade.find(scenario, "pScoped").getInstance(player);
            Assert.fail("Instances from other players should not be readable");
        } catch (Exception ex) {
            // expected exeption
        }

        // PlayerScope broadcast to team
        // p21 & p12 have distinct instances, but p21 can read the p22 one
        Assert.assertNotEquals(variableDescriptorFacade.find(scenario, "pScoped_ts").getInstance(player21), variableDescriptorFacade.find(scenario, "pScoped_ts").getInstance(player22));

        try {
            variableDescriptorFacade.find(scenario, "pScoped_ts").getInstance(player);
            Assert.fail("Instances from other teams should not be readable");
        } catch (Exception ex) {
            // expected exeption
        }

        // PlayerScope, broadcast to game
        // three distinct instances
        Assert.assertNotEquals(variableDescriptorFacade.find(scenario, "pScoped_gs").getInstance(player21), variableDescriptorFacade.find(scenario, "pScoped_gs").getInstance(player22));
        Assert.assertNotEquals(variableDescriptorFacade.find(scenario, "pScoped_gs").getInstance(player21), variableDescriptorFacade.find(scenario, "pScoped_gs").getInstance(player));
        Assert.assertNotEquals(variableDescriptorFacade.find(scenario, "pScoped_gs").getInstance(player22), variableDescriptorFacade.find(scenario, "pScoped_gs").getInstance(player));
    }
}
