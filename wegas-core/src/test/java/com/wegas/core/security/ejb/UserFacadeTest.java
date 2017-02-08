package com.wegas.core.security.ejb;

import com.wegas.core.ejb.AbstractEJBTestBase;
import com.wegas.core.ejb.TestHelper;
import com.wegas.core.exception.client.WegasErrorMessage;
import com.wegas.core.exception.internal.WegasNoResultException;
import com.wegas.core.security.jparealm.JpaAccount;
import com.wegas.core.security.persistence.AbstractAccount;
import com.wegas.core.security.persistence.Permission;
import com.wegas.core.security.persistence.Role;
import com.wegas.core.security.persistence.User;
import java.util.Calendar;
import java.util.List;
import java.util.Map;
import javax.ejb.EJBException;
import org.junit.AfterClass;
import org.junit.Assert;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * @author Yannick Lagger
 */
public class UserFacadeTest extends AbstractEJBTestBase {

    private static final Logger logger = LoggerFactory.getLogger(UserFacadeTest.class);

    private static JpaAccount abstractAccount;

    private static User u;

    private static Role role1;

    private static Role role2;

    private static final String ROLE_1 = "Role_1";

    private static final String ROLE_2 = "Role_2";

    private static final String EMAIL = "userfacadetest@local";

    @BeforeClass
    public static void setUpClass() throws Exception {
        role1 = new Role(ROLE_1);
        roleFacade.create(role1);
        role2 = new Role(ROLE_2);
        roleFacade.create(role2);

        u = AbstractEJBTestBase.signup(EMAIL);
        abstractAccount = (JpaAccount) u.getMainAccount();

        userFacade.addRole(u.getId(), role1.getId());
        userFacade.addRole(u.getId(), role2.getId());
    }

    @AfterClass
    public static void tearDownClass() throws Exception {
        userFacade.remove(u.getId());
        roleFacade.remove(role1.getId());
        roleFacade.remove(role2.getId());
        TestHelper.closeContainer();
    }

    @Before
    public void doLogout() {
        userFacade.logout(); //Make sure to start without anyone logged in
    }

    @Test
    public void testSetup() throws WegasNoResultException {
        Role publicRole = roleFacade.findByName(ROLE_1);
        Role registered = roleFacade.findByName(ROLE_2);

        Assert.assertEquals(1l, publicRole.getUsers().size());
        Assert.assertEquals(1l, registered.getUsers().size());
    }

    /**
     * Test of find method, of class UserFacade.
     */
    @Test
    public void testFind() {

        // findAll()
        List<User> users = userFacade.findAll();
        Assert.assertEquals(u, users.get(0));

        // find
        Assert.assertEquals(u, userFacade.find(u.getId()));
    }

    @Test
    public void testAccountUpdate() {
        final String PERM = "Game:*:*";
        final String PERM2 = "Game2:*:*";

        u.addPermission(PERM);
        accountFacade.update(abstractAccount.getId(), abstractAccount);
        AbstractAccount a = accountFacade.find(abstractAccount.getId());
        Assert.assertEquals(PERM, u.getPermissions().get(0).getValue());

        u.addPermission(PERM2);
        accountFacade.update(abstractAccount.getId(), a);
        a = accountFacade.find(abstractAccount.getId());
        Assert.assertEquals(PERM2, u.getPermissions().get(1).getValue());

        u.removePermission(PERM2);
        u.removePermission(PERM);
        accountFacade.update(a.getId(), a);
        a = accountFacade.find(abstractAccount.getId());
        Assert.assertTrue(a.getPermissions().isEmpty());
    }

    @Test
    public void testRoleUpdate() throws Exception {
        final String PERM = "Game:*:*";

        role1.addPermission(PERM);
        roleFacade.update(role1.getId(), role1);
        Role r = roleFacade.find(role1.getId());
        Assert.assertEquals(PERM, r.getPermissions().get(0).getValue());

        r.removePermission(PERM);
        roleFacade.update(r.getId(), r);
        r = roleFacade.find(r.getId());
        Assert.assertTrue(r.getPermissions().isEmpty());
    }

    /**
     * Test of add and get permissions
     */
    @Test
    public void testAddAndGetPermissions() throws Exception {
        // Add permissions
        userFacade.addRolePermission(role1.getId(), "GameModel:Edit:gm1");
        userFacade.addRolePermission(role1.getId(), "GameModel:View:gm1");
        Assert.assertFalse(userFacade.addRolePermission(role1.getId(), "GameModel:View:gm1"));

        // Get all GameModel permissions by GameModel id or Game permissions by Game id
        List<Map> rolePermissions = userFacade.findRolePermissionByInstance("gm1");
        Assert.assertEquals(ROLE_1, rolePermissions.get(0).get("name"));

        List<String> permissions = (List<String>) rolePermissions.get(0).get("permissions");

        Assert.assertEquals(2l, permissions.size());

        Assert.assertTrue(permissions.contains("GameModel:Edit:gm1"));
        Assert.assertTrue(permissions.contains("GameModel:View:gm1"));

        userFacade.deleteRolePermissionsByIdAndInstance(role1.getId(), "gm1");
    }

    /**
     * Test testDeletePermissionByInstance
     */
    @Test
    public void testDeleteRolePermission() throws Exception {
        // Add permissions
        userFacade.addRolePermission(role1.getId(), "GameModel:Edit:gm1");
        userFacade.addRolePermission(role1.getId(), "GameModel:View:gm1");

        userFacade.deleteRolePermission(role1.getId(), "GameModel:View:gm1");
        List<Map> rolePermissions = userFacade.findRolePermissionByInstance("gm1");
        Assert.assertEquals("[GameModel:Edit:gm1]", rolePermissions.get(0).get("permissions").toString());

        userFacade.deleteRolePermission(role1.getId(), "GameModel:Edit:gm1");
        rolePermissions = userFacade.findRolePermissionByInstance("gm1");
        Assert.assertEquals("[]", rolePermissions.toString());
    }

    /**
     * Test deleteAllRolePermissions
     */
    @Test
    public void testDeleteRolePermissionsByIdAndInstance() throws Exception {
        userFacade.addRolePermission(role2.getId(), "GameModel:Edit:gm20");
        userFacade.addRolePermission(role2.getId(), "GameModel:View:gm20");
        userFacade.addRolePermission(role2.getId(), "GameModel:Token:gm20");

        // Delete all permission from a role in a Game or GameModel
        List<Map> rolePermissions = userFacade.findRolePermissionByInstance("gm20");
        List<String> permissions = (List<String>) rolePermissions.get(0).get("permissions");

        Assert.assertEquals(3l, permissions.size());
        Assert.assertTrue(permissions.contains("GameModel:Edit:gm20"));
        Assert.assertTrue(permissions.contains("GameModel:View:gm20"));
        Assert.assertTrue(permissions.contains("GameModel:Token:gm20"));

        userFacade.deleteRolePermissionsByIdAndInstance(role2.getId(), "gm20");
        Role r = roleFacade.findByName(ROLE_2);
        Assert.assertEquals(0, r.getPermissions().size());
    }

    /**
     * Test DeleteAllRolePermissionsById
     */
    @Test
    public void testDeleteRolePermissionsByInstance() throws Exception {
        userFacade.addRolePermission(role2.getId(), "GameModel:Edit:gm20");
        userFacade.addRolePermission(role2.getId(), "GameModel:View:gm20");
        userFacade.addRolePermission(role2.getId(), "GameModel:Token:gm20");

        userFacade.addRolePermission(role1.getId(), "GameModel:Edit:gm20");
        userFacade.addRolePermission(role1.getId(), "GameModel:View:gm20");
        userFacade.addRolePermission(role1.getId(), "GameModel:Token:gm20");

        userFacade.deleteRolePermissionsByInstance("gm20");

        List<Map> rolePermission = userFacade.findRolePermissionByInstance("gm20");
        Assert.assertEquals("[]", rolePermission.toString());
    }

    /**
     * Test DeleteAllRolePermissionsById
     */
    @Test
    public void testDeleteAccountPermission() throws Exception {
        userFacade.addUserPermission(u.getId(), "GameModel:Edit:gm100");
        userFacade.addUserPermission(u.getId(), "GameModel:View:gm100");
        userFacade.addUserPermission(u.getId(), "GameModel:Edit:gm200");
        userFacade.addUserPermission(u.getId(), "GameModel:View:gm200");

        userFacade.findUserPermissionByInstance("gm200");

        userFacade.deleteUserPermissionByInstance("gm100");

//        Assert.assertTrue(accountFacade.find(abstractAccount.getId()).getPermissions().contains(new Permission("GameModel:Edit:gm200")));
        List<Permission> permissions = userFacade.find(u.getId()).getPermissions();

        Assert.assertFalse(permissions.contains(new Permission("GameModel:Edit:gm100")));
        Assert.assertFalse(permissions.contains(new Permission("GameModel:View:gm100")));
        Assert.assertTrue(permissions.contains(new Permission("GameModel:Edit:gm200")));
        Assert.assertTrue(permissions.contains(new Permission("GameModel:View:gm200")));
        userFacade.deleteUserPermissionByInstance("gm200");
    }

    /**
     * Test SendNewPassword
     */
    @Test
    public void testSendNewPassword() throws Exception {
        JpaAccount acc = accountFacade.findByEmail(EMAIL);
        String oldPwd = acc.getPasswordHex();
        userFacade.sendNewPassword(EMAIL);
        acc = accountFacade.findByEmail(EMAIL);
        Assert.assertFalse(oldPwd.equals(acc.getPasswordHex()));
    }

    /**
     * Test CreateSameUser
     */
    @Test(expected = EJBException.class)
    public void testCreateSameUser() throws WegasErrorMessage {
        u.addAccount(abstractAccount);
        userFacade.create(u);
    }

    @Test
    public void testIdleGuestRemoval() {
        userFacade.guestLogin();                                                // Log in as guest

        Assert.assertEquals(2, userFacade.findAll().size());                    // Assert creation

        User user = userFacade.getCurrentUser();                                // Set created time to 3 month ago
        Calendar calendar = Calendar.getInstance();
        calendar.set(Calendar.MONTH, calendar.get(Calendar.MONTH) - 13);
        AbstractAccount account = user.getMainAccount();
        account.setCreatedTime(calendar.getTime());
        accountFacade.merge(account);

        userFacade.removeIdleGuests();                                          // Run idle guest account removal

        Assert.assertEquals(1, userFacade.findAll().size());                    // Assert removal succes
    }

    @Test
    public void testRemoveRole() {

        Role r = new Role("Test");
        roleFacade.create(r);
        //r = roleFacade.find(r.getId());

        Assert.assertEquals("Test", roleFacade.find(r.getId()).getName());

        userFacade.addRole(u.getId(), r.getId());

        //roleFacade.merge(r);
        //accountFacade.merge(abstractAccount);
        Assert.assertEquals(3, accountFacade.find(abstractAccount.getId()).getRoles().size());
        Assert.assertEquals(1, roleFacade.find(r.getId()).getNumberOfMember());
        roleFacade.remove(r.getId());

        Assert.assertNull(roleFacade.find(r.getId()));                                             // A not NoResultException should be thrown here
    }
}
